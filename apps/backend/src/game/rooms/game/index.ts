import { Room, Client as ColyseusClient } from '@colyseus/core'
import {
  GameRoomState,
  Engine,
  GameEvent,
  generateSnapshot,
  GameMapName,
  SchemaEvent,
  ActivateObjectsEventData,
  DeactivateObjectsEventData,
  PingObjectsEventData,
  PlayerJoinEventData,
  WorldEvents,
  PlayerLeftEventData,
  GameMapFieldObject,
  PlayerLostRoundEventData,
  PlayerPinballRedeployEventData,
} from '@pinball/shared'
import GameController from '../../controllers/GameController'

export interface ClientData {
  userId?: string
}

export type Client = ColyseusClient<ClientData>

export class GameRoom extends Room<GameRoomState> {
  override maxClients = 2
  gameController: GameController
  mapName: GameMapName

  constructor() {
    super()
    this.mapName = GameMapName.SINGLEPLAYER
    this.gameController = new GameController(this.mapName)
    this.setPatchRate(Engine.MIN_DELTA)
  }

  override onCreate() {
    this.clock.start()
    this.gameController.setRoomId(this.roomId)
    this.setState(new GameRoomState(this.mapName))
    this.setSimulationInterval(this.update.bind(this), Engine.MIN_DELTA)

    this.onMessage(
      GameEvent.ACTIVATE_OBJECTS,
      this.handleActivateObjects.bind(this)
    )
    this.onMessage(
      GameEvent.DEACTIVATE_OBJECTS,
      this.handleDeactivateObjects.bind(this)
    )
  }

  override onJoin(client: Client, options: { userId?: string } | undefined) {
    if (!options?.userId) {
      return client.leave()
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

    client.send(GameEvent.INIT)

    const eventData: PlayerJoinEventData = {
      playerId: gamePlayer.id,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEvent.PLAYER_JOIN, JSON.stringify(eventData))
    )

    if (this.gameController.players.size >= this.maxClients) {
      this.gameController.startGame()
    }
  }

  override onLeave(client: Client) {
    if (!client.userData?.userId) return

    const playerId = this.gameController.handlePlayerLeave(client)
    this.state.players.delete(playerId)
    this.broadcast(GameEvent.PLAYER_LEFT, playerId)

    const eventData: PlayerLeftEventData = {
      playerId,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEvent.PLAYER_LEFT, JSON.stringify(eventData))
    )
  }

  override onDispose() {
    this.gameController.handleRoomDispose()
  }

  update(delta: number) {
    const snapshots = this.gameController.update(delta)
    snapshots.forEach((snapshot) => {
      this.gameController.syncRoomStateBySnapshot(this.state, snapshot)
    })

    this.broadcastPatch()
    this.state.events = []
  }

  handlePingObject({
    playerId,
    fieldObject,
  }: {
    playerId: string
    fieldObject: GameMapFieldObject
  }) {
    const eventData: PingObjectsEventData = {
      playerId,
      label: fieldObject.label,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEvent.PING_OBJECTS, JSON.stringify(eventData))
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
      playerId,
      pinballId,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(
        GameEvent.PLAYER_PINBALL_REDEPLOY,
        JSON.stringify(eventData)
      )
    )
  }

  handlePlayerLostRound(playerId: string) {
    const eventData: PlayerLostRoundEventData = {
      playerId,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEvent.PLAYER_LOST_ROUND, JSON.stringify(eventData))
    )
  }

  handleActivateObjects(client: Client, labels: string[]) {
    if (!client.userData?.userId) return

    this.gameController.handleActivateObjects(client, labels)

    const eventData: ActivateObjectsEventData = {
      playerId: client.userData?.userId,
      labels,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEvent.ACTIVATE_OBJECTS, JSON.stringify(eventData))
    )
  }

  handleDeactivateObjects(client: Client, labels: string[]) {
    if (!client.userData?.userId) return

    this.gameController.handleDeactivateObjects(client, labels)

    const eventData: DeactivateObjectsEventData = {
      playerId: client.userData.userId,
      labels,
      frame: this.state.frame,
      time: this.state.time,
    }

    this.state.events.push(
      new SchemaEvent(GameEvent.DEACTIVATE_OBJECTS, JSON.stringify(eventData))
    )
  }
}
