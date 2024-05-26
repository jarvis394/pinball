import { GAME_MAPS, GameMapData, GameMapName } from '@pinball/shared'
import {
  Engine,
  Player,
  SchemaPinball,
  GameRoomState,
  SchemaPlayer,
  Snapshot,
} from '@pinball/engine'
import { Client } from '../rooms/game'

class GamePlayer {
  id: string
  clientId: string
  engine: Engine
  map: GameMapData
  lastSentSnapshotFrame: number = 1

  constructor(id: string, clientId: string, map: GameMapData) {
    this.id = id
    this.clientId = clientId
    this.map = map
    this.engine = new Engine()
  }

  init() {
    // Load map for singleplayer game
    this.engine.game.world.loadMap(this.map)

    // Add player to engine
    const player = this.engine.game.world.addPlayer(this.id)
    this.engine.game.setMe(player)

    // Add pinball with ID of player
    const pinball = this.engine.game.world.addPinballForPlayer(this.id, this.id)

    return { player, pinball }
  }

  setScore(score: number) {
    this.engine.game.me!.score = score
  }

  setCurrentScore(score: number) {
    this.engine.game.me!.currentScore = score
  }

  setHighScore(score: number) {
    this.engine.game.me!.highScore = score
  }
}

class GameController {
  players: Map<string, GamePlayer>
  mapName: GameMapName
  map: GameMapData
  roomId: string | null

  constructor(mapName: GameMapName) {
    this.roomId = null
    this.mapName = mapName
    this.map = GAME_MAPS[mapName]
    this.players = new Map()
  }

  startGame() {
    this.players.forEach((player) => {
      player.engine.game.startGame()
    })
  }

  endGame() {
    this.players.forEach((player) => {
      player.engine.game.endGame()
    })
  }

  setRoomId(roomId: string) {
    this.roomId = roomId
  }

  update(delta: number): Map<Player['id'], Snapshot> {
    const snapshots: Map<Player['id'], Snapshot> = new Map()

    this.players.forEach((player) => {
      const snapshot = player.engine.update(delta)
      player.engine.game.flushEvents()
      snapshot && snapshots.set(player.id, snapshot)
    })

    return snapshots
  }

  syncRoomStateBySnapshot(state: GameRoomState, snapshot: Snapshot) {
    state.frame = Number(snapshot.frame)
    state.timestamp = snapshot.timestamp
    state.lastDelta = snapshot.lastDelta

    let player = state.players.get(snapshot.playerId)

    if (!player) {
      player = new SchemaPlayer(snapshot.playerId)
      player.map.map = this.mapName
      player.map.activeObjects = []
      state.players.set(player.id, player)
    }

    player.currentScore = snapshot.playerCurrentScore
    player.highScore = snapshot.playerHighScore
    player.score = snapshot.playerScore
    player.map.activeObjects = snapshot.mapActiveObjects

    for (const snapshotPinball of snapshot.state.pinballs) {
      let pinball = player.map.pinballs.get(snapshotPinball.id)

      if (!pinball) {
        pinball = new SchemaPinball(
          snapshotPinball.id,
          snapshotPinball.playerId
        )
        player.map.pinballs.set(pinball.id, pinball)
      }

      pinball.position.x = snapshotPinball.positionX
      pinball.position.y = snapshotPinball.positionY
      pinball.velocity.x = snapshotPinball.velocityX
      pinball.velocity.y = snapshotPinball.velocityY
    }

    return state
  }

  /** @returns Created player for newly joined client */
  handlePlayerJoin(client: Client, userId: string): GamePlayer {
    const gamePlayer = new GamePlayer(userId, client.id, this.map)
    gamePlayer.init()

    this.players.set(gamePlayer.id, gamePlayer)

    client.userData = {
      userId,
    }

    return gamePlayer
  }

  /** @returns ID of disconnected player */
  handlePlayerLeave(client: Client): Player['id'] {
    const userId = client.userData?.userId
    if (!userId) {
      throw new Error('No user id provided in userData on player leave')
    }

    const player = this.players.get(userId)

    player?.engine.game.clear()
    player?.engine.destroy()

    this.players.delete(userId)

    return userId
  }

  handleRoomDispose() {
    this.players.forEach((player) => {
      player.engine.game.clear()
      player.engine.destroy()
    })

    this.players.clear()
  }

  handleActivateObjects(client: Client, labels: string[]) {
    const userId = client.userData?.userId
    if (!userId) return

    const player = this.players.get(userId)
    if (!player) {
      console.warn(`Player ${userId} not found when trying to activate objects`)
      return
    }

    player.engine.game.world.handleActivateObjects(labels)
  }

  handleDeactivateObjects(client: Client, labels: string[]) {
    const userId = client.userData?.userId
    if (!userId) return

    const player = this.players.get(userId)
    if (!player) {
      console.warn(
        `Player ${userId} not found when trying to deactivate objects`
      )
      return
    }

    player.engine.game.world.handleDeactivateObjects(labels)
  }
}

export default GameController
