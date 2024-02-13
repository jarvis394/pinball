import {
  Engine,
  EventEmitter,
  GAME_MAPS,
  GameEvent,
  GameRoomState,
  Player,
  SchemaPlayer,
  Snapshot,
  SnapshotPinball,
  restoreMapActiveObjectsFromSnapshot,
  restorePinballsFromSnapshot,
  restorePlayerFromSnapshot,
} from '@pinball/shared'
import Matter from 'matter-js'
import * as Colyseus from 'colyseus.js'
import { WS_HOSTNAME } from '../config/constants'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'

export enum ClientEngineEvents {
  INIT_ROOM = 'init_room',
  PLAYER_JOIN = 'player_join',
  PLAYER_LEFT = 'player_left',
}

type ClientEngineEmitterEvents = {
  [ClientEngineEvents.INIT_ROOM]: () => void
  [ClientEngineEvents.PLAYER_JOIN]: (player: Player) => void
  [ClientEngineEvents.PLAYER_LEFT]: (playerId: Player['id']) => void
}

enum ClientInputActionKeyCodes {
  RIGHT = 'ArrowRight',
  LEFT = 'ArrowLeft',
  SPACE = 'Space',
}

export class ClientEngine extends EventEmitter<ClientEngineEmitterEvents> {
  private static PADDLE_LEFT_LABEL = 'paddle_bottom_left'
  private static PADDLE_RIGHT_LABEL = 'paddle_bottom_right'

  engine: Engine
  client: Colyseus.Client
  room?: Colyseus.Room<GameRoomState>
  playerId: string | null
  keysPressed: Set<string> = new Set()
  heldKeys: Set<string> = new Set()
  timeOffset: number
  snapshots: SnapshotInterpolation

  constructor(engine: Engine, playerId: string | null) {
    super()

    this.engine = engine
    this.playerId = playerId
    this.client = new Colyseus.Client(WS_HOSTNAME)
    this.timeOffset = -1
    this.snapshots = new SnapshotInterpolation(Engine.MIN_FPS, {
      autoCorrectTimeOffset: true,
    })
  }

  init() {
    Matter.Events.on(
      this.engine.matterEngine,
      'beforeUpdate',
      this.handleBeforeUpdate.bind(this)
    )

    // window.addEventListener('touchstart', this.onTouchStart.bind(this))
    // window.addEventListener('touchend', this.onTouchEnd.bind(this))
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  async startGame() {
    if (!this.playerId) return

    this.room = await this.client.joinOrCreate<GameRoomState>('game', {
      playerId: this.playerId,
    })

    this.room.state.players.onAdd((player) => {
      this.handleAddPlayer(player)
    }, true)

    this.room.state.players.onRemove((player, id) => {
      console.log('remove player', player, id)
    })

    this.room.onStateChange(this.handleRoomStateChange.bind(this))
    this.room.onMessage(GameEvent.INIT, this.handleRoomInit.bind(this))
  }

  handleRoomInit() {
    if (!this.engine.game.world.map) {
      this.engine.game.loadMap(GAME_MAPS[this.room!.state.mapName])
    }
    this.eventEmitter.emit(ClientEngineEvents.INIT_ROOM)
  }

  handleAddPlayer(schemaPlayer: SchemaPlayer) {
    if (this.playerId !== schemaPlayer.id) {
      // TODO: write
      console.warn('Add player that is not local:', schemaPlayer)
      return
    }

    if (!this.engine.game.world.map) {
      this.engine.game.loadMap(GAME_MAPS[schemaPlayer.map.map])
    }

    const player = this.engine.game.world.addPlayer(schemaPlayer.id)
    player.currentScore = schemaPlayer.currentScore
    player.highScore = schemaPlayer.highScore
    player.setServerControlled(true)
    this.engine.game.setMe(player)

    schemaPlayer.map.pinballs.forEach((schemaPinball) => {
      const pinball = this.engine.game.world.addPinballForPlayer(
        schemaPinball.id,
        schemaPinball.playerId
      )

      Matter.Body.setPosition(pinball.body, schemaPinball.position)
      Matter.Body.setVelocity(pinball.body, schemaPinball.velocity)
    })
  }

  handleRoomStateChange(state: GameRoomState) {
    this.engine.frame = state.frame
    this.engine.frameTimestamp = state.time

    if (!this.playerId) return

    const schemaPlayer = state.players.get(this.playerId)
    if (!schemaPlayer) return

    const pinballs: SnapshotPinball[] = []

    schemaPlayer.map.pinballs.forEach((schemaPinball) => {
      pinballs.push({
        id: schemaPinball.id,
        playerId: schemaPinball.playerId,
        positionX: schemaPinball.position.x,
        positionY: schemaPinball.position.y,
        velocityX: schemaPinball.velocity.x,
        velocityY: schemaPinball.velocity.y,
      })
    })

    const snapshot: Snapshot = {
      id: state.frame.toString(),
      time: state.time,
      playerId: schemaPlayer.id,
      playerCurrentScore: schemaPlayer.currentScore,
      playerHighScore: schemaPlayer.highScore,
      mapName: schemaPlayer.map.map,
      mapActiveObjects: schemaPlayer.map.activeObjects,
      state: {
        pinballs,
      },
    }

    this.snapshots.snapshot.add(snapshot)
  }

  handleBeforeUpdate() {
    this.handlePressedKeys()
  }

  update() {
    const interpolatedSnapshot = this.snapshots.calcInterpolation(
      'positionX positionY velocityX velocityY',
      'pinballs'
    )
    const snapshot = this.snapshots.vault.getById(
      interpolatedSnapshot?.newer || ''
    ) as Snapshot | undefined

    if (!interpolatedSnapshot || !snapshot) return

    const pinballs = interpolatedSnapshot.state as Snapshot['state']['pinballs']

    restorePlayerFromSnapshot(this.engine, snapshot)
    restoreMapActiveObjectsFromSnapshot(this.engine, snapshot.mapActiveObjects)
    restorePinballsFromSnapshot(this.engine, pinballs)
  }

  handlePressedKeys() {
    this.keysPressed.forEach((keyCode) => {
      // Do not proceed with handlers if the key is held
      // Useful for sending just one event to server/client engine
      if (this.heldKeys.has(keyCode)) return

      switch (keyCode) {
        case ClientInputActionKeyCodes.LEFT:
          this.handleActivateObjects([ClientEngine.PADDLE_LEFT_LABEL])
          break
        case ClientInputActionKeyCodes.RIGHT:
          this.handleActivateObjects([ClientEngine.PADDLE_RIGHT_LABEL])
          break
        case ClientInputActionKeyCodes.SPACE:
          this.handleActivateObjects([
            ClientEngine.PADDLE_LEFT_LABEL,
            ClientEngine.PADDLE_RIGHT_LABEL,
          ])
          break
      }

      if (!this.heldKeys.has(keyCode)) {
        this.heldKeys.add(keyCode)
      }
    })
  }

  handleActivateObjects(labels: string[]) {
    this.room?.send(GameEvent.ACTIVATE_OBJECTS, labels)
  }

  handleDeactivateObjects(labels: string[]) {
    this.room?.send(GameEvent.DEACTIVATE_OBJECTS, labels)
  }

  onKeyDown(e: KeyboardEvent) {
    this.keysPressed.add(e.code)
  }

  onKeyUp(e: KeyboardEvent) {
    this.keysPressed.delete(e.code)
    this.heldKeys.delete(e.code)

    switch (e.code) {
      case ClientInputActionKeyCodes.LEFT:
        this.handleDeactivateObjects([ClientEngine.PADDLE_LEFT_LABEL])
        break
      case ClientInputActionKeyCodes.RIGHT:
        this.handleDeactivateObjects([ClientEngine.PADDLE_RIGHT_LABEL])
        break
      case ClientInputActionKeyCodes.SPACE:
        this.handleDeactivateObjects([
          ClientEngine.PADDLE_LEFT_LABEL,
          ClientEngine.PADDLE_RIGHT_LABEL,
        ])
        break
    }
  }
}
