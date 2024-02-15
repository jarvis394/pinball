import {
  Engine,
  EventEmitter,
  GAME_MAPS,
  GameEvent,
  GameMapObjectType,
  GameResultsEventData,
  GameRoomState,
  GameStartedEventData,
  InitEventData,
  PingObjectsEventData,
  PlayerJoinEventData,
  PlayerLeftEventData,
  PlayerLostRoundEventData,
  Snapshot,
  SnapshotEvent,
  SnapshotPinball,
  exhaustivnessCheck,
  restoreMapActiveObjectsFromSnapshot,
  restorePinballsFromSnapshot,
  restorePlayerFromSnapshot,
} from '@pinball/shared'
import Matter from 'matter-js'
import * as Colyseus from 'colyseus.js'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import {
  ClientEnginePlayer,
  ClientEnginePlayerJson,
} from './ClientEnginePlayer'

const parseData = <T>(data?: string) => {
  if (!data) return false

  try {
    return JSON.parse(data) as T
  } catch (e) {
    return false
  }
}

export enum ClientEngineEvents {
  INIT_ROOM = 'init_room',
  LEAVE_ROOM = 'leave_room',
  GAME_ENDED = 'game_end',
  PLAYER_JOIN = 'player_join',
  PLAYER_LEFT = 'player_left',
  PLAYER_STATS_CHANGE = 'player_stats_change',
}

export type ClientEngineGameResultsEventData = GameResultsEventData & {
  players: Record<string, ClientEnginePlayerJson>
}

type ClientEngineEmitterEvents = {
  [ClientEngineEvents.INIT_ROOM]: (initData: InitEventData) => void
  [ClientEngineEvents.LEAVE_ROOM]: (code: number) => void
  [ClientEngineEvents.GAME_ENDED]: (
    results: ClientEngineGameResultsEventData
  ) => void
  [ClientEngineEvents.PLAYER_JOIN]: (player: ClientEnginePlayer) => void
  [ClientEngineEvents.PLAYER_STATS_CHANGE]: (player: ClientEnginePlayer) => void
  [ClientEngineEvents.PLAYER_LEFT]: (playerId: ClientEnginePlayer['id']) => void
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
  client?: Colyseus.Client
  room?: Colyseus.Room<GameRoomState>
  userId: string | null
  keysPressed: Set<string> = new Set()
  heldKeys: Set<string> = new Set()
  timeOffset: number
  snapshots: SnapshotInterpolation
  players: Map<string, ClientEnginePlayer> = new Map()
  deferredEvents: SnapshotEvent[] = []

  constructor(engine: Engine, userId: string | null) {
    super()

    this.engine = engine
    this.userId = userId
    this.timeOffset = -1
    this.snapshots = new SnapshotInterpolation(Engine.MIN_FPS, {
      autoCorrectTimeOffset: true,
    })

    // Disable collisions locally because events come with snapshots
    this.engine.game.world.disableCollisions()

    Matter.Events.on(
      this.engine.matterEngine,
      'beforeUpdate',
      this.handleBeforeUpdate.bind(this)
    )

    // window.addEventListener('touchstart', this.onTouchStart.bind(this))
    // window.addEventListener('touchend', this.onTouchEnd.bind(this))
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))

    this.engine.start()
  }

  setClient(client: Colyseus.Client) {
    this.client = client
  }

  setRoom(room: Colyseus.Room<GameRoomState>) {
    this.room = room
  }

  startGame() {
    if (!this.userId) {
      console.error('Cannot start game: ClientEngine does not have userId')
      return
    }

    if (!this.room) {
      console.error('Cannot start game: ClientEngine does not have room')
      return
    }

    this.room.onLeave((code) => {
      console.log('Leaving room:', code)
      this.eventEmitter.emit(ClientEngineEvents.LEAVE_ROOM, code)
    })

    this.room.onError((code, message) => {
      console.error('Error occured in connection:', code, message)
    })

    this.room.onStateChange(this.handleRoomStateChange.bind(this))
    this.room.onMessage(GameEvent.INIT, this.handleRoomInit.bind(this))
    this.room.onMessage(GameEvent.GAME_STARTED, this.handleGameStart.bind(this))
  }

  handleGameStart(data: GameStartedEventData) {
    console.log('Starting game', data)
    this.engine.game.startGame()
  }

  handleRoomInit(initData: InitEventData) {
    if (!this.userId) return
    if (!this.engine.game.world.map) {
      this.engine.game.loadMap(GAME_MAPS[this.room!.state.mapName])
    }

    const events: SnapshotEvent[] = []

    // Add all players from state to client engine
    Object.values(initData.players).forEach((userData) => {
      const data: PlayerJoinEventData = {
        elo: userData.elo,
        playerId: userData.id.toString(),
        frame: 0,
        time: 0,
      }
      events.push({
        event: GameEvent.PLAYER_JOIN,
        data: JSON.stringify(data),
      })
    })

    this.processSnapshotEvents(events)

    this.eventEmitter.emit(ClientEngineEvents.INIT_ROOM, initData)
  }

  handleRoomStateChange(state: GameRoomState) {
    this.engine.frame = state.frame
    this.engine.frameTimestamp = state.time

    if (!this.userId) return

    const schemaPlayer = state.players.get(this.userId)
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
      playerScore: schemaPlayer.score,
      playerCurrentScore: schemaPlayer.currentScore,
      playerHighScore: schemaPlayer.highScore,
      mapName: schemaPlayer.map.map,
      mapActiveObjects: schemaPlayer.map.activeObjects,
      events: state.events.map((e) => ({
        data: e.data,
        event: e.event,
      })),
      state: {
        pinballs,
      },
    }

    // Update players statistics for React<->ClientEngine compatibility
    this.players.forEach((clientEnginePlayer) => {
      let changed = false
      const player = state.players.get(clientEnginePlayer.id)
      if (!player) return

      if (clientEnginePlayer.currentScore !== player.currentScore) {
        clientEnginePlayer.currentScore = player.currentScore
        changed = true
      }
      if (clientEnginePlayer.highScore !== player.highScore) {
        clientEnginePlayer.highScore = player.highScore
        changed = true
      }
      if (clientEnginePlayer.score !== player.score) {
        clientEnginePlayer.score = player.score
        changed = true
      }

      if (changed) {
        this.eventEmitter.emit(
          ClientEngineEvents.PLAYER_STATS_CHANGE,
          clientEnginePlayer
        )
      }
    })

    this.snapshots.snapshot.add(snapshot)
    this.processSnapshotEvents(snapshot.events)
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
    this.processDeferredEvents()
  }

  processDeferredEvents() {
    this.deferredEvents.forEach((event) => {
      switch (event.event) {
        case GameEvent.INIT:
        case GameEvent.UPDATE:
        case GameEvent.ACTIVATE_OBJECTS:
        case GameEvent.DEACTIVATE_OBJECTS:
        case GameEvent.GAME_STARTED:
        case GameEvent.PLAYER_PINBALL_REDEPLOY:
        case GameEvent.GAME_ENDED:
        case GameEvent.PLAYER_JOIN:
        case GameEvent.PLAYER_LEFT:
        case GameEvent.PLAYER_LOST_ROUND:
          break
        case GameEvent.PING_OBJECTS:
          this.handlePingObjectsEvent(event.data)
          break
        default:
          return exhaustivnessCheck(event.event)
      }
    })

    this.deferredEvents = []
  }

  processSnapshotEvents(snapshotEvents: SnapshotEvent[]) {
    snapshotEvents.forEach((event) => {
      switch (event.event) {
        case GameEvent.INIT:
        case GameEvent.UPDATE:
        case GameEvent.ACTIVATE_OBJECTS:
        case GameEvent.DEACTIVATE_OBJECTS:
        case GameEvent.GAME_STARTED:
        case GameEvent.PLAYER_PINBALL_REDEPLOY:
          break
        // Deferred events executed on snapshots sync (ClientEngine.update)
        case GameEvent.PING_OBJECTS: {
          this.deferredEvents.push(event)
          break
        }
        case GameEvent.GAME_ENDED: {
          this.handleGameEndedEvent(event.data)
          break
        }
        case GameEvent.PLAYER_JOIN: {
          this.handlePlayerJoinEvent(event.data)
          break
        }
        case GameEvent.PLAYER_LEFT: {
          this.handlePlayerLeftEvent(event.data)
          break
        }
        case GameEvent.PLAYER_LOST_ROUND: {
          this.handlePlayerLostRoundEvent(event.data)
          break
        }
        default:
          return exhaustivnessCheck(event.event)
      }
    })
  }

  handleGameEndedEvent(raw?: string) {
    const data = parseData<GameResultsEventData>(raw)
    if (!data) return
    const players: ClientEngineGameResultsEventData['players'] = {}

    this.players.forEach((player) => {
      players[player.id] = player.toJSON()
    })

    this.eventEmitter.emit(ClientEngineEvents.GAME_ENDED, {
      ...data,
      players,
    })
    this.room?.leave(true)
  }

  handlePlayerJoinEvent(raw?: string) {
    const data = parseData<PlayerJoinEventData>(raw)
    if (!data) return

    if (this.players.has(data.playerId)) {
      return
    }

    const schemaPlayer = this.room?.state.players.get(data.playerId)
    const clientEnginePlayer = new ClientEnginePlayer({
      id: data.playerId,
      elo: data.elo,
      score: 0,
      currentScore: 0,
      highScore: 0,
    })
    this.players.set(data.playerId, clientEnginePlayer)

    clientEnginePlayer.loadVkUserData().then(() => {
      this.eventEmitter.emit(ClientEngineEvents.PLAYER_JOIN, clientEnginePlayer)

      if (!schemaPlayer) return

      // Do not add player to local engine if player is not the local client
      if (this.userId !== schemaPlayer.id) {
        return
      }

      // Load map for local client
      if (!this.engine.game.world.map) {
        this.engine.game.loadMap(GAME_MAPS[schemaPlayer.map.map])
      }

      const player = this.engine.game.world.addPlayer(schemaPlayer.id)
      player.currentScore = schemaPlayer.currentScore
      player.highScore = schemaPlayer.highScore
      player.score = schemaPlayer.score
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
    })
  }

  handlePlayerLeftEvent(raw?: string) {
    const data = parseData<PlayerLeftEventData>(raw)
    if (!data) return

    this.players.delete(data.playerId)
  }

  handlePingObjectsEvent(raw?: string) {
    const data = parseData<PingObjectsEventData>(raw)
    if (!data || !this.engine.game.me || !this.engine.game.world.map) return
    if (data.playerId !== this.engine.game.me.id) return

    const fieldObject = this.engine.game.world.map.fieldObjects[data.label]
    const object = this.engine.game.world.map.objects[fieldObject?.objectId]

    if (object.objectType !== GameMapObjectType.BUMPER) return

    this.engine.game.world.pingBumperForPlayer(
      this.engine.game.me,
      object,
      fieldObject
    )
  }

  handlePlayerLostRoundEvent(raw?: string) {
    const data = parseData<PlayerLostRoundEventData>(raw)
    if (!data) return

    const player = this.engine.game.world.players.get(data.playerId)
    if (!player) return

    this.engine.game.world.loseRoundForPlayer(player)
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

  destroy() {
    this.room?.removeAllListeners()
    this.room = undefined
    this.engine.destroy()
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }
}
