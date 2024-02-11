import { Engine, EventEmitter, Player } from '@pinball/engine'
import Matter from 'matter-js'

export enum ClientEngineEvents {
  INIT_ROOM = 'init_room',
  PLAYER_JOIN = 'player_join',
  PLAYER_LEFT = 'player_left',
}

type ClientEngineEmitterEvents = {
  [ClientEngineEvents.PLAYER_JOIN]: (player: Player) => void
  [ClientEngineEvents.PLAYER_LEFT]: (playerId: Player['id']) => void
}

enum ClientInputActionKeyCodes {
  RIGHT = 'ArrowRight',
  LEFT = 'ArrowLeft',
  SPACE = 'Space',
}

export class ClientEngine extends EventEmitter<ClientEngineEmitterEvents> {
  engine: Engine
  playerId: string | null
  keysPressed: Set<string> = new Set()
  timeOffset: number

  constructor(engine: Engine, playerId: string | null) {
    super()

    this.engine = engine
    this.playerId = playerId
    this.timeOffset = -1
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

    // this.channel.onConnect(() => {
    //   console.log('connected', this.channel)

    //   this.channel.on(GameEvents.INIT, (message) => {
    //     this.handleInitRoom(message as InitEventMessage)
    //   })
    //   this.channel.on(GameEvents.UPDATE, (message) => {
    //     this.handleSnapshotRecieve(message as Snapshot)
    //   })
    //   this.channel.on(GameEvents.SHOOT_ACK, (message) => {
    //     this.handleShootAck(message as ShootAckEventMessage)
    //   })
    //   this.channel.on(GameEvents.PLAYER_JOIN, (message) => {
    //     this.handlePlayerJoin(message as PlayerJoinEventMessage)
    //   })
    //   this.channel.on(GameEvents.PLAYER_LEFT, (message) => {
    //     this.handlePlayerLeft(message as PlayerLeftEventMessage)
    //   })
    // })
  }

  handleBeforeUpdate() {
    this.handlePressedKeys()
  }

  handlePressedKeys() {
    this.keysPressed.forEach((keyCode) => {
      switch (keyCode) {
        case ClientInputActionKeyCodes.LEFT:
          this.engine.game.world.map?.activePaddles.add('paddle_bottom_left')
          break
        case ClientInputActionKeyCodes.RIGHT:
          this.engine.game.world.map?.activePaddles.add('paddle_bottom_right')
          break
        case ClientInputActionKeyCodes.SPACE:
          for (const key of this.engine.game.world.map?.paddles.keys() || []) {
            this.engine.game.world.map?.activePaddles.add(key)
          }
          break
      }
    })
  }

  onKeyDown(e: KeyboardEvent) {
    this.keysPressed.add(e.code)
  }

  onKeyUp(e: KeyboardEvent) {
    this.keysPressed.delete(e.code)

    switch (e.code) {
      case ClientInputActionKeyCodes.LEFT:
        this.engine.game.world.map?.activePaddles.delete('paddle_bottom_left')
        break
      case ClientInputActionKeyCodes.RIGHT:
        this.engine.game.world.map?.activePaddles.delete('paddle_bottom_right')
        break
      case ClientInputActionKeyCodes.SPACE:
        this.engine.game.world.map?.activePaddles.clear()
        break
    }
  }
}
