import {
  Engine,
  GAME_MAPS,
  GameMapData,
  GameMapName,
  GameRoomState,
  Player,
  SchemaPinball,
  SchemaPlayer,
  Snapshot,
  generateSnapshot,
} from '@pinball/shared'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { Client } from 'colyseus'

class GamePlayer {
  id: string
  engine: Engine
  map: GameMapData
  snapshotInterpolation: SnapshotInterpolation

  constructor(id: string, map: GameMapData) {
    this.id = id
    this.map = map
    this.engine = new Engine()
    this.snapshotInterpolation = new SnapshotInterpolation()
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

  setRoomId(roomId: string) {
    this.roomId = roomId
  }

  update(delta: number): Snapshot[] {
    const snapshots: Snapshot[] = []
    this.players.forEach((player) => {
      player.engine.update(delta)
      const snapshot = generateSnapshot(player.engine)
      snapshots.push(snapshot)
      player.snapshotInterpolation.snapshot.add(snapshot)
    })

    return snapshots
  }

  syncRoomStateBySnapshot(state: GameRoomState, snapshot: Snapshot) {
    state.frame = Number(snapshot.id)
    state.time = snapshot.time

    let player = state.players.get(snapshot.playerId)

    if (!player) {
      player = new SchemaPlayer(snapshot.playerId)
      player.map.map = this.mapName
      player.map.activeObjects = []
      state.players.set(player.id, player)
    }

    player.currentScore = snapshot.playerCurrentScore
    player.highScore = snapshot.playerHighScore
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

    // state.players.forEach((player) => {
    //   if (!this.engine.game.world.getPlayerByID(player.id)) {
    //     state.players.delete(player.id)
    //   }
    // })

    // state.bullets.forEach((bullet) => {
    //   if (!this.engine.game.world.getBulletByID(bullet.id)) {
    //     state.bullets.delete(bullet.id)
    //   }
    // })
  }

  /** @returns Created player for newly joined client */
  handlePlayerJoin(client: Client, playerId: string): GamePlayer {
    const gamePlayer = new GamePlayer(playerId, this.map)
    gamePlayer.init()

    this.players.set(gamePlayer.id, gamePlayer)

    client.userData = {
      playerId,
    }

    return gamePlayer
  }

  /** @returns ID of disconnected player */
  handlePlayerLeave(client: Client): Player['id'] {
    const playerId = client.userData.playerId
    const player = this.players.get(playerId)

    player?.engine.game.clear()
    player?.engine.destroy()

    this.players.delete(playerId)

    return playerId
  }

  handleRoomDispose() {
    console.log('room', this.roomId, 'disposing...')

    this.players.forEach((player) => {
      player.engine.game.clear()
      player.engine.destroy()
    })

    this.players.clear()
  }

  handleActivateObjects(client: Client, labels: string[]) {
    const playerId = client.userData?.playerId
    const player = this.players.get(playerId)
    if (!player) {
      throw new Error(
        `Player ${playerId} not found when trying to activate objects`
      )
    }

    labels.forEach((label) => {
      player.engine.game.world.map?.activePaddles.add(label)
    })
  }

  handleDeactivateObjects(client: Client, labels: string[]) {
    const playerId = client.userData?.playerId
    const player = this.players.get(playerId)
    if (!player) {
      throw new Error(
        `Player ${playerId} not found when trying to deactivate objects`
      )
    }

    labels.forEach((label) => {
      player.engine.game.world.map?.activePaddles.delete(label)
    })
  }
}

export default GameController
