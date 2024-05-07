import {
  GAME_MAPS,
  GameMapObjectType,
  exhaustivnessCheck,
} from '@pinball/shared'
import {
  GameRoomState,
  Snapshot,
  SnapshotEvent,
  SnapshotPinball,
  generateSnapshot,
  restoreEngineFromSnapshot,
  restoreMapActiveObjectsFromSnapshot,
  restorePinballsFromSnapshot,
  restorePlayerFromSnapshot,
  areSnapshotsClose,
  SchemaPlayer,
} from '@pinball/colyseus-schema'
import Matter from 'matter-js'
import * as Colyseus from 'colyseus.js'
import { SnapshotInterpolation, Vault } from 'snapshot-interpolation'
import {
  ClientEnginePlayer,
  ClientEnginePlayerJson,
  VKUserData,
} from './ClientEnginePlayer'
import {
  Engine,
  EventEmitter,
  GameEventName,
  GameResultsEventData,
  GameStartedEventData,
  InitEventData,
  PingObjectsEventData,
  PlayerJoinEventData,
  PlayerLeftEventData,
  PlayerLostRoundEventData,
  ActivateObjectsEventData,
  DeactivateObjectsEventData,
} from '@pinball/engine'

// TODO: refactor to Event model
const parseData = <T>(data?: string) => {
  if (!data) return false

  try {
    return JSON.parse(data) as T
  } catch (e) {
    return false
  }
}

type BeforeUpdateEvent = Matter.IEventTimestamped<Matter.Engine> & {
  delta: number
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

// TODO: Rewrite event system so events are stored in a queue from all snapshots received from server
export class ClientEngine extends EventEmitter<ClientEngineEmitterEvents> {
  private static PADDLE_LEFT_LABEL = 'paddle_bottom_left'
  private static PADDLE_RIGHT_LABEL = 'paddle_bottom_right'

  engine: Engine
  localEngine: Engine
  client?: Colyseus.Client
  room?: Colyseus.Room<GameRoomState>
  userId: string | null
  keysPressed: Set<string> = new Set()
  /** Stores keys from onKeyUp and onTouchEnd events */
  keysReleased: Set<string> = new Set()
  heldKeys: Set<string> = new Set()
  timeOffset: number
  snapshots: SnapshotInterpolation<Snapshot>
  players: Map<string, ClientEnginePlayer> = new Map()
  /** Events that are executed on snapshots sync (ClientEngine.update)  */
  // deferredEvents: SnapshotEvent[] = []
  clientSnapshotsVault: Vault<Snapshot>
  localVKUserData?: VKUserData
  /** Changed to true after GameEvent.GAME_INIT event from server */
  isGameInitialized = false
  /** Queue for storing all events (including deferred events) */
  pendingEvents: SnapshotEvent[] = []

  constructor(
    engine: Engine,
    userId: string | null,
    localVKUserData?: VKUserData
  ) {
    super()

    this.engine = engine
    this.localEngine = new Engine()
    this.userId = userId
    this.timeOffset = -1
    this.snapshots = new SnapshotInterpolation({
      serverFPS: Engine.MIN_FPS,
      vaultSize: 200,
    })
    this.clientSnapshotsVault = new Vault(200)
    this.localVKUserData = localVKUserData

    Matter.Events.on(
      this.engine.matterEngine,
      'beforeUpdate',
      this.handleBeforeUpdate.bind(this)
    )

    window.addEventListener('touchstart', this.onTouchStart.bind(this))
    window.addEventListener('touchend', this.onTouchEnd.bind(this))
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

    this.room.onMessage(GameEventName.INIT, this.handleRoomInit.bind(this))
    this.room.onMessage(
      GameEventName.GAME_STARTED,
      this.handleGameStart.bind(this)
    )
    this.room.onStateChange(this.handleRoomStateChange.bind(this))
  }

  handleGameStart(data: GameStartedEventData) {
    console.log('Starting game', data)
    this.engine.game.startGame()
    this.localEngine.game.startGame()
  }

  handleRoomInit(data: InitEventData) {
    if (!this.userId || !this.room) return

    console.log('Initializing room with init data:', data)

    // Load map for local client
    this.engine.game.loadMap(GAME_MAPS[this.room.state.mapName])
    this.localEngine.game.loadMap(GAME_MAPS[this.room.state.mapName])

    // Add all players from state to client engine
    Object.values(data.players).forEach((userData) => {
      const data: PlayerJoinEventData = {
        name: GameEventName.PLAYER_JOIN,
        elo: userData.elo,
        playerId: userData.id.toString(),
        frame: 0,
        time: 0,
      }
      this.pendingEvents.push({
        event: GameEventName.PLAYER_JOIN,
        data: JSON.stringify(data),
      })
    })

    this.processPendingSnapshotEvents()

    this.eventEmitter.emit(ClientEngineEvents.INIT_ROOM, data)
    this.isGameInitialized = true
  }

  handleRoomStateChange(state: GameRoomState) {
    if (!this.userId) return
    if (!this.isGameInitialized) return

    this.engine.frame = state.frame
    this.engine.frameTimestamp = state.timestamp

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
      frame: state.frame,
      timestamp: state.timestamp,
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

    this.snapshots.addSnapshot(snapshot)
    this.pendingEvents.concat(snapshot.events)
    this.reconcileEngine()
  }

  getLatestSnapshots(): {
    serverSnapshot: Snapshot | undefined
    playerSnapshot: Snapshot | undefined
  } {
    const serverSnapshot = this.snapshots.vault.getLast()
    const playerSnapshot = this.clientSnapshotsVault.getLast()

    return { serverSnapshot, playerSnapshot }
  }

  syncEngineByLocalEngine() {
    this.localEngine.game.world.pinballs.forEach((reconciledPinball) => {
      const enginePinball = this.engine.game.world.pinballs.get(
        reconciledPinball.id
      )

      if (!enginePinball) return

      const offsetX =
        enginePinball.body.position.x - reconciledPinball.body.position.x
      const offsetY =
        enginePinball.body.position.y - reconciledPinball.body.position.y
      const correctionCoeff = 1

      Matter.Body.setPosition(
        enginePinball.body,
        Matter.Vector.create(
          enginePinball.body.position.x - offsetX / correctionCoeff,
          enginePinball.body.position.y - offsetY / correctionCoeff
        )
      )
    })
  }

  reconcileEngine() {
    const { serverSnapshot, playerSnapshot } = this.getLatestSnapshots()
    if (!serverSnapshot || !playerSnapshot) return

    this.reconcilePinballs(serverSnapshot, playerSnapshot)
  }

  reconcilePinballs(serverSnapshot: Snapshot, playerSnapshot: Snapshot) {
    let currentSnapshot = serverSnapshot
    let currentTime = serverSnapshot.timestamp
    let currentPlayerSnapshot =
      this.clientSnapshotsVault.getClosest(currentTime)

    if (!currentPlayerSnapshot) {
      console.warn(
        `[reconcile ${serverSnapshot.frame}] Cannot find snapshot in client vault closest to time ${currentTime}`
      )
      return
    }
    if (areSnapshotsClose(currentPlayerSnapshot, currentSnapshot)) {
      return
    }

    const playerSnapshots: Snapshot[] = []

    // Iterate backwards from present time to server time
    // to collect all player snapshots
    for (
      let cur = playerSnapshot.timestamp;
      cur > serverSnapshot.timestamp;
      cur -= Engine.MIN_DELTA
    ) {
      const snapshot = this.clientSnapshotsVault.getClosest(cur)
      snapshot && playerSnapshots.push(snapshot)
    }

    this.clientSnapshotsVault.remove(
      this.clientSnapshotsVault.size,
      playerSnapshots.length
    )

    restoreEngineFromSnapshot(this.localEngine, currentSnapshot, {
      restoreNonServerControlled: true,
    })

    while (currentTime < playerSnapshot.timestamp) {
      currentPlayerSnapshot = this.clientSnapshotsVault.getClosest(currentTime)

      if (!currentPlayerSnapshot) {
        console.warn(
          `[reconcile ${serverSnapshot.frame}] Cannot find snapshot in client vault closest to time ${currentTime} (inside loop)`
        )
        currentTime += Engine.MIN_DELTA
        this.localEngine.update(Engine.MIN_DELTA)
        continue
      }

      currentPlayerSnapshot.events.forEach((event) => {
        const data = JSON.parse(event.data || '')

        switch (event.event) {
          case GameEventName.ACTIVATE_OBJECTS: {
            const typedEventData = data as ActivateObjectsEventData
            console.log('activate objects', typedEventData)
            this.changeObjectsStateInLocalEngine(typedEventData.labels, true)
            break
          }
          case GameEventName.DEACTIVATE_OBJECTS: {
            const typedEventData = data as DeactivateObjectsEventData
            console.log('deactivate objects', typedEventData)
            this.changeObjectsStateInLocalEngine(typedEventData.labels, false)
            break
          }
          case GameEventName.PLAYER_LOST_ROUND: {
            console.log('lose round')
            this.handlePlayerLostRoundEvent(data)
            break
          }
        }
      })

      this.localEngine.game.events =
        currentSnapshot?.events.map((event) => ({
          data: JSON.parse(event.data || ''),
          name: event.event,
        })) || []

      currentSnapshot = generateSnapshot(this.localEngine)
      currentTime = currentSnapshot.timestamp
      playerSnapshots.push(currentSnapshot)
      this.localEngine.update(Engine.MIN_DELTA)
    }

    playerSnapshots.forEach((snapshot) =>
      this.clientSnapshotsVault.add(snapshot)
    )
  }

  handleBeforeUpdate(event: BeforeUpdateEvent) {
    this.handlePressedKeys()
    this.handleReleasedKeys()

    this.localEngine.update(event.delta)

    const snapshot = generateSnapshot(this.localEngine)
    this.clientSnapshotsVault.add(snapshot)
  }

  update() {
    const interpolatedSnapshot = this.snapshots.calcInterpolation(
      {
        positionX: 'linear',
        positionY: 'linear',
        velocityX: 'linear',
        velocityY: 'linear',
      },
      'pinballs'
    )
    const snapshot = this.snapshots.vault.getByFrame(
      interpolatedSnapshot?.newer || -1
    )

    if (!interpolatedSnapshot || !snapshot) return

    const pinballs = interpolatedSnapshot.state

    restorePlayerFromSnapshot(this.engine, snapshot)
    restoreMapActiveObjectsFromSnapshot(this.engine, snapshot)
    restorePinballsFromSnapshot(this.engine, pinballs)
    this.processPendingSnapshotEvents()
    this.syncEngineByLocalEngine()
  }

  processPendingSnapshotEvents() {
    this.pendingEvents.forEach((event) => this.processSnapshotEvent(event))
    this.pendingEvents = []
  }

  processSnapshotEvent(event: SnapshotEvent) {
    switch (event.event) {
      case GameEventName.UPDATE:
      case GameEventName.ACTIVATE_OBJECTS:
      case GameEventName.DEACTIVATE_OBJECTS:
      case GameEventName.PLAYER_PINBALL_REDEPLOY:
      case GameEventName.PLAYER_LOST_ROUND:
        break
      // We handle these events separately in constructor of ClientEngine
      // Events below are sent by server via regular send method, not with snapshot
      case GameEventName.INIT:
      case GameEventName.GAME_STARTED:
        break
      case GameEventName.PING_OBJECTS: {
        this.handlePingObjectsEvent(event.data)
        break
      }
      case GameEventName.GAME_ENDED: {
        this.handleGameEndedEvent(event.data)
        break
      }
      case GameEventName.PLAYER_JOIN: {
        this.handlePlayerJoinEvent(event.data)
        break
      }
      case GameEventName.PLAYER_LEFT: {
        this.handlePlayerLeftEvent(event.data)
        break
      }
      default:
        return exhaustivnessCheck(event.event)
    }
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

  async handlePlayerJoinEvent(raw?: string) {
    const data = parseData<PlayerJoinEventData>(raw)
    if (!data) return

    // Do not process if player already exists
    if (this.players.has(data.playerId)) {
      return
    }

    const schemaPlayer = this.room?.state.players.get(data.playerId)
    if (!schemaPlayer) return

    // We get data for local player when first entering application
    // so reuse that cached information here and fetch later otherwise
    const vkUserData =
      this.userId === data.playerId ? this.localVKUserData : undefined
    const clientEnginePlayer = new ClientEnginePlayer({
      id: data.playerId,
      elo: data.elo,
      score: schemaPlayer.score,
      currentScore: schemaPlayer.currentScore,
      highScore: schemaPlayer.highScore,
      vkUserData,
    })
    this.players.set(data.playerId, clientEnginePlayer)

    if (!clientEnginePlayer.vkUserData) {
      await clientEnginePlayer.loadVkUserData()
    }

    this.addPlayerToEngine(this.engine, schemaPlayer)
    this.addPlayerToEngine(this.localEngine, schemaPlayer)
    this.eventEmitter.emit(ClientEngineEvents.PLAYER_JOIN, clientEnginePlayer)
  }

  addPlayerToEngine(engine: Engine, schemaPlayer: SchemaPlayer) {
    const player = engine.game.world.addPlayer(schemaPlayer.id)
    player.currentScore = schemaPlayer.currentScore
    player.highScore = schemaPlayer.highScore
    player.score = schemaPlayer.score
    player.setServerControlled(this.userId !== schemaPlayer.id)

    if (this.userId === schemaPlayer.id) {
      engine.game.setMe(player)

      // note: This applies only for pinball game as we cannot add external pinballs to a game
      schemaPlayer.map.pinballs.forEach((schemaPinball) => {
        const pinball = engine.game.world.addPinballForPlayer(
          schemaPinball.id,
          schemaPinball.playerId
        )

        Matter.Body.setPosition(pinball.body, schemaPinball.position)
        Matter.Body.setVelocity(pinball.body, schemaPinball.velocity)
      })
    }
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
    this.localEngine.game.world.loseRoundForPlayer(player)
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

  handleReleasedKeys() {
    this.keysReleased.forEach((keyCode) => {
      switch (keyCode) {
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
    })
    this.keysReleased.clear()
  }

  handleActivateObjects(labels: string[]) {
    this.room?.send(GameEventName.ACTIVATE_OBJECTS, labels)
    this.changeObjectsStateInLocalEngine(labels, true)
  }

  handleDeactivateObjects(labels: string[]) {
    this.room?.send(GameEventName.DEACTIVATE_OBJECTS, labels)
    this.changeObjectsStateInLocalEngine(labels, false)
  }

  changeObjectsStateInLocalEngine(labels: string[], state: boolean) {
    if (!this.userId) return

    labels.forEach((label) => {
      if (state) {
        this.engine.game.world.map?.activePaddles.add(label)
        this.localEngine.game.world.map?.activePaddles.add(label)
      } else {
        this.engine.game.world.map?.activePaddles.delete(label)
        this.localEngine.game.world.map?.activePaddles.delete(label)
      }
    })

    if (state) {
      this.engine.game.handleActivateObjects(labels)
      this.localEngine.game.handleActivateObjects(labels)
    } else {
      this.engine.game.handleDeactivateObjects(labels)
      this.localEngine.game.handleDeactivateObjects(labels)
    }

    const eventName =
      GameEventName[state ? 'ACTIVATE_OBJECTS' : 'DEACTIVATE_OBJECTS']
    const eventData: ActivateObjectsEventData | DeactivateObjectsEventData = {
      name: eventName,
      frame: this.localEngine.frame,
      time: this.localEngine.frameTimestamp,
      labels,
      playerId: this.userId,
    }
    const mapActiveObjects: string[] = []
    const clientSnapshot = this.clientSnapshotsVault.getLast()
    if (!clientSnapshot) {
      console.warn(
        'Last client snapshot when changing object state was not found'
      )
      return
    }

    this.localEngine.game.world.map?.activePaddles.forEach((label) => {
      mapActiveObjects.push(label)
    })

    clientSnapshot.mapActiveObjects = mapActiveObjects
    clientSnapshot.events.push({
      event: eventName,
      data: JSON.stringify(eventData),
    })

    console.log(clientSnapshot.frame, clientSnapshot)
    this.clientSnapshotsVault.remove(this.clientSnapshotsVault.size - 1)
    this.clientSnapshotsVault.add(clientSnapshot)
  }

  onKeyDown(e: KeyboardEvent) {
    this.keysPressed.add(e.code)
  }

  onKeyUp(e: KeyboardEvent) {
    this.releaseKeyByKeyCode(e.code)
  }

  releaseKeyByKeyCode(keyCode: string) {
    this.heldKeys.delete(keyCode)
    this.keysPressed.delete(keyCode)
    this.keysReleased.add(keyCode)
  }

  onTouchStart(e: TouchEvent) {
    for (const touch of e.touches) {
      if (touch.clientX < window.innerWidth / 2) {
        this.keysPressed.add(ClientInputActionKeyCodes.LEFT)
      } else {
        this.keysPressed.add(ClientInputActionKeyCodes.RIGHT)
      }
    }

    return false
  }

  onTouchEnd(e: TouchEvent) {
    for (const touch of e.changedTouches) {
      if (touch.clientX < window.innerWidth / 2) {
        this.releaseKeyByKeyCode(ClientInputActionKeyCodes.LEFT)
      } else {
        this.releaseKeyByKeyCode(ClientInputActionKeyCodes.RIGHT)
      }
    }

    return false
  }

  destroy() {
    this.clientSnapshotsVault = new Vault()
    this.room?.removeAllListeners()
    this.room = undefined
    this.engine.destroy()
    this.localEngine.destroy()
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('touchstart', this.onTouchStart)
    window.removeEventListener('touchend', this.onTouchEnd)
  }
}
