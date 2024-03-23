import { Room, Client as ColyseusClient } from '@colyseus/core'
import {
  GameMapName,
  GameMapFieldObject,
  exhaustivnessCheck,
} from '@pinball/shared'
import {
  GameRoomState,
  generateSnapshot,
  SchemaEvent,
} from '@pinball/colyseus-schema'
import {
  Engine,
  GameEventName,
  ActivateObjectsEventData,
  DeactivateObjectsEventData,
  PingObjectsEventData,
  PlayerJoinEventData,
  WorldEvents,
  PlayerLeftEventData,
  PlayerLostRoundEventData,
  PlayerPinballRedeployEventData,
  InitEventData,
  GameResultsEventData,
  Game,
  GameResult,
} from '@pinball/engine'
import GameController from '../../controllers/GameController'
import { User, PrismaClient } from '@prisma/client'

export interface ClientData {
  userId?: string
}

export type Client = ColyseusClient<ClientData>

export class GameRoom extends Room<GameRoomState> {
  /** How much elo points should be subtracted or added */
  public static GAME_ELO_CHANGE = 10

  override maxClients = 2
  prismaClient: PrismaClient
  gameController: GameController
  mapName: GameMapName
  dbPlayersData: Record<string, User>

  constructor() {
    super()
    this.dbPlayersData = {}
    this.prismaClient = new PrismaClient()
    this.mapName = GameMapName.SINGLEPLAYER
    this.gameController = new GameController(this.mapName)
    this.setPatchRate(Engine.MIN_DELTA)
  }

  override onCreate() {
    this.clock.stop()
    this.gameController.setRoomId(this.roomId)
    this.setState(new GameRoomState(this.mapName))

    this.onMessage(
      GameEventName.ACTIVATE_OBJECTS,
      this.handleActivateObjects.bind(this)
    )
    this.onMessage(
      GameEventName.DEACTIVATE_OBJECTS,
      this.handleDeactivateObjects.bind(this)
    )
  }

  override async onJoin(
    client: Client,
    options: { userId?: string } | undefined
  ) {
    if (!options?.userId) {
      return client.leave()
    }

    if (this.metadata.singleplayer) {
      this.maxClients = 1
    }

    this.allowReconnection(client, 'manual')

    const prevClients = this.clients.filter(
      (e) => e.userData?.playerId === options.userId
    )

    if (prevClients) {
      prevClients.forEach((prevClient) => prevClient.leave())
    }

    const gamePlayer = this.gameController.handlePlayerJoin(
      client,
      options.userId
    )
    const snapshot = generateSnapshot(gamePlayer.engine)
    this.gameController.syncRoomStateBySnapshot(this.state, snapshot)

    gamePlayer.engine.game.world.addEventListener(
      WorldEvents.BUMPER_HIT,
      (param) => this.handlePingObject(param)
    )
    gamePlayer.engine.game.world.addEventListener(
      WorldEvents.PLAYER_LOST_ROUND,
      (playerId) => this.handlePlayerLostRound(playerId)
    )
    gamePlayer.engine.game.world.addEventListener(
      WorldEvents.PLAYER_PINBALL_REDEPLOY,
      (param) => this.handlePlayerPinballRedeploy(param)
    )

    client.userData = {
      userId: gamePlayer.id,
    }

    const dbUser = await this.prismaClient.user.findUnique({
      where: {
        id: Number(gamePlayer.id),
      },
    })

    // Client should always have record in DB as it
    // should create on matchmaking seat reservation
    if (!dbUser) {
      return client.leave()
    }

    this.dbPlayersData[gamePlayer.id] = dbUser

    const initData: InitEventData = {
      name: GameEventName.INIT,
      players: this.dbPlayersData,
    }

    client.send(GameEventName.INIT, initData)

    const eventData: PlayerJoinEventData = {
      name: GameEventName.PLAYER_JOIN,
      playerId: gamePlayer.id,
      frame: this.state.frame,
      time: this.state.time,
      elo: dbUser.elo,
    }

    this.state.events.push(
      new SchemaEvent(GameEventName.PLAYER_JOIN, JSON.stringify(eventData))
    )

    this.broadcast(GameEventName.PLAYER_JOIN, eventData)

    if (this.shouldStartGame()) {
      this.clock.start()
      this.setSimulationInterval(this.update.bind(this), Engine.MIN_DELTA)
      this.gameController.startGame()
      this.broadcast(GameEventName.GAME_STARTED, initData)
    }
  }

  override onLeave(client: Client) {
    if (!client.userData?.userId) return

    const playerId = this.gameController.handlePlayerLeave(client)
    this.state.players.delete(playerId)

    const eventData: PlayerLeftEventData = {
      name: GameEventName.PLAYER_LEFT,
      playerId,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEventName.PLAYER_LEFT, JSON.stringify(eventData))
    )

    this.broadcast(GameEventName.PLAYER_LEFT, eventData)
  }

  override onDispose() {
    this.gameController.handleRoomDispose()
  }

  shouldEndGame() {
    return this.clock.elapsedTime >= Game.DURATION
  }

  shouldStartGame() {
    return this.gameController.players.size >= this.maxClients
  }

  update(delta: number) {
    this.state.events = []

    if (!this.shouldStartGame()) {
      return
    }

    if (this.shouldEndGame()) {
      this.handleGameEnd()
      return
    }

    const snapshots = this.gameController.update(delta)
    snapshots.forEach((snapshot) => {
      this.gameController.syncRoomStateBySnapshot(this.state, snapshot)
    })
  }

  async handleGameEnd() {
    if (this.gameController.players.size === 0) return

    const data: GameResultsEventData = {
      name: GameEventName.GAME_ENDED,
      eloChange: {},
      placements: [],
    }

    this.gameController.players.forEach((player) => {
      if (!player.engine.game.me) return

      data.placements.push({
        playerId: player.id,
        score: player.engine.game.me.score,
        highScore: player.engine.game.me.highScore,
        result: GameResult.LOST,
      })
    })

    data.placements = data.placements.sort((a, b) =>
      a.score > b.score ? -1 : 1
    )
    if (data.placements[0]) {
      data.placements[0].result = GameResult.WON
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions: any[] = []

    // Update users' elo
    data.placements.forEach((placement) => {
      const player = this.dbPlayersData[placement.playerId]
      if (!player) return

      let change = 0

      switch (placement.result) {
        case GameResult.LOST: {
          // Player's elo cannot go lower than 0
          if (player.elo !== 0) {
            change = -GameRoom.GAME_ELO_CHANGE
          }
          break
        }
        case GameResult.WON: {
          change = GameRoom.GAME_ELO_CHANGE
          break
        }
        default:
          return exhaustivnessCheck(placement.result)
      }

      const newElo = player.elo + change

      data.eloChange[placement.playerId] = {
        change,
        elo: newElo,
      }

      transactions.push(
        this.prismaClient.user.update({
          where: {
            id: Number(placement.playerId),
          },
          data: {
            elo: newElo,
          },
        })
      )
    })

    await this.prismaClient.$transaction(transactions)

    this.state.events.push(
      new SchemaEvent(GameEventName.GAME_ENDED, JSON.stringify(data))
    )

    this.gameController.endGame()
  }

  handlePingObject({
    playerId,
    fieldObject,
  }: {
    playerId: string
    fieldObject: GameMapFieldObject
  }) {
    const eventData: PingObjectsEventData = {
      name: GameEventName.PING_OBJECTS,
      playerId,
      label: fieldObject.label,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEventName.PING_OBJECTS, JSON.stringify(eventData))
    )
  }

  handlePlayerPinballRedeploy({
    playerId,
    pinballId,
  }: {
    playerId: string
    pinballId: string
  }) {
    const eventData: PlayerPinballRedeployEventData = {
      name: GameEventName.PLAYER_PINBALL_REDEPLOY,
      playerId,
      pinballId,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(
        GameEventName.PLAYER_PINBALL_REDEPLOY,
        JSON.stringify(eventData)
      )
    )
  }

  handlePlayerLostRound(playerId: string) {
    const eventData: PlayerLostRoundEventData = {
      name: GameEventName.PLAYER_LOST_ROUND,
      playerId,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(
        GameEventName.PLAYER_LOST_ROUND,
        JSON.stringify(eventData)
      )
    )
  }

  handleActivateObjects(client: Client, labels: string[]) {
    if (!client.userData?.userId) return

    this.gameController.handleActivateObjects(client, labels)

    const eventData: ActivateObjectsEventData = {
      name: GameEventName.ACTIVATE_OBJECTS,
      playerId: client.userData?.userId,
      labels,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEventName.ACTIVATE_OBJECTS, JSON.stringify(eventData))
    )
  }

  handleDeactivateObjects(client: Client, labels: string[]) {
    if (!client.userData?.userId) return

    this.gameController.handleDeactivateObjects(client, labels)

    const eventData: DeactivateObjectsEventData = {
      name: GameEventName.DEACTIVATE_OBJECTS,
      playerId: client.userData.userId,
      labels,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(
        GameEventName.DEACTIVATE_OBJECTS,
        JSON.stringify(eventData)
      )
    )
  }
}
