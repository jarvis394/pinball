import { Room, Client } from '@colyseus/core'
import {
  GameRoomState,
  Engine,
  GameEvent,
  generateSnapshot,
  GameMapName,
} from '@pinball/shared'
import GameController from '../../controllers/GameController'

export class GameRoom extends Room<GameRoomState> {
  maxClients = 2
  gameController: GameController
  mapName: GameMapName

  constructor() {
    super()
    this.mapName = GameMapName.SINGLEPLAYER
    this.gameController = new GameController(this.mapName)
    this.setPatchRate(Engine.MIN_DELTA)
  }

  onCreate() {
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

  onJoin(client: Client, options: { playerId?: string } | undefined) {
    if (!options?.playerId) {
      return client.leave()
    }

    const gamePlayer = this.gameController.handlePlayerJoin(
      client,
      options.playerId
    )
    const snapshot = generateSnapshot(gamePlayer.engine)
    this.gameController.syncRoomStateBySnapshot(this.state, snapshot)

    client.userData = {
      playerId: gamePlayer.id,
    }

    client.send(GameEvent.INIT)
  }

  onLeave(client: Client) {
    if (!client.userData?.playerId) return

    const playerId = this.gameController.handlePlayerLeave(client)
    this.state.players.delete(playerId)
    this.broadcast(GameEvent.PLAYER_LEFT, playerId)
  }

  onDispose() {
    this.gameController.handleRoomDispose()
  }

  update(delta: number) {
    const snapshots = this.gameController.update(delta)
    snapshots.forEach((snapshot) => {
      this.gameController.syncRoomStateBySnapshot(this.state, snapshot)
    })
  }

  handleActivateObjects(client: Client, labels: string[]) {
    console.log('activate obj:', client.userData, labels)
    this.gameController.handleActivateObjects(client, labels)
  }

  handleDeactivateObjects(client: Client, labels: string[]) {
    console.log('deactivate obj:', client.userData, labels)
    this.gameController.handleDeactivateObjects(client, labels)
  }
}
