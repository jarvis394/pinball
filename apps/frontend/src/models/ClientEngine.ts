import {
  GAME_MAPS,
  GameMapObjectType,
  exhaustivnessCheck,
} from '@pinball/shared'
import Matter from 'matter-js'
import * as Colyseus from 'colyseus.js'
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
  GameRoomState,
  Snapshot,
  SnapshotEvent,
  generateSnapshot,
  restoreEngineFromSnapshot,
  areSnapshotsClose,
  SchemaPlayer,
} from '@pinball/engine'
import { SnapshotInterpolation } from 'snapshot-interpolation'

const MAX_LOCAL_POSITION_ERROR = 16

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

  reconciliationEngine: Engine
  engine: Engine
  serverSnapshots: SnapshotInterpolation<Snapshot>
  client?: Colyseus.Client
  room?: Colyseus.Room<GameRoomState>
  userId: string | null
  keysPressed: Set<string> = new Set()
  /** Stores keys from onKeyUp and onTouchEnd events */
  keysReleased: Set<string> = new Set()
  heldKeys: Set<string> = new Set()
  players: Map<string, ClientEnginePlayer> = new Map()
  /** Events that are executed on snapshots sync (ClientEngine.update)  */
  // deferredEvents: SnapshotEvent[] = []
  localVKUserData?: VKUserData
  /** Changed to true after GameEvent.GAME_INIT event from server */
  isGameInitialized = false
  /** Queue for storing all events (including deferred events) */
  pendingEvents: SnapshotEvent[] = []

  constructor(userId: string | null, localVKUserData?: VKUserData) {
    super()

    this.serverSnapshots = new SnapshotInterpolation({
      vaultSize: Engine.SNAPSHOTS_VAULT_SIZE,
      serverFPS: Engine.MIN_FPS,
    })
    this.reconciliationEngine = new Engine()
    this.engine = new Engine()
    this.userId = userId
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
    this.room.onMessage(GameEventName.UPDATE, this.handleUpdateEvent.bind(this))
    this.room.onMessage(
      GameEventName.PLAYER_JOIN,
      this.handlePlayerJoinEvent.bind(this)
    )
    this.room.onMessage(
      GameEventName.GAME_STARTED,
      this.handleGameStart.bind(this)
    )
    this.room.onMessage(
      GameEventName.GAME_ENDED,
      this.handleGameEndedEvent.bind(this)
    )
  }

  handleGameStart(data: GameStartedEventData) {
    console.log('Starting game', data)
    this.engine.start()
    this.reconciliationEngine.game.startGame()
    this.engine.game.startGame()
  }

  handleRoomInit(data: InitEventData) {
    if (!this.userId || !this.room) return

    console.log('Initializing room with init data:', data)

    // Load map for local client
    this.reconciliationEngine.game.loadMap(GAME_MAPS[this.room.state.mapName])
    this.engine.game.loadMap(GAME_MAPS[this.room.state.mapName])

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

  handleUpdateEvent(snapshots: Snapshot[]) {
    if (!this.userId) return
    if (!this.isGameInitialized) return

    snapshots.forEach((snapshot) => {
      this.serverSnapshots.addSnapshot(snapshot)
      this.pendingEvents.concat(snapshot.events)
    })

    const lastSnapshot = snapshots.at(-1)
    if (!lastSnapshot) return

    // Update players statistics for React<->ClientEngine compatibility
    this.players.forEach((clientEnginePlayer) => {
      let changed = false

      if (clientEnginePlayer.id !== lastSnapshot.playerId) return

      if (clientEnginePlayer.currentScore !== lastSnapshot.playerCurrentScore) {
        clientEnginePlayer.currentScore = lastSnapshot.playerCurrentScore
        changed = true
      }
      if (clientEnginePlayer.highScore !== lastSnapshot.playerHighScore) {
        clientEnginePlayer.highScore = lastSnapshot.playerHighScore
        changed = true
      }
      if (clientEnginePlayer.score !== lastSnapshot.playerScore) {
        clientEnginePlayer.score = lastSnapshot.playerScore
        changed = true
      }

      if (changed) {
        this.eventEmitter.emit(
          ClientEngineEvents.PLAYER_STATS_CHANGE,
          clientEnginePlayer
        )
      }
    })

    this.reconcileEngine()
  }

  getLatestSnapshots(): {
    serverSnapshot: Snapshot | undefined
    playerSnapshot: Snapshot | undefined
  } {
    const serverSnapshot = this.serverSnapshots.vault.getLast()
    const playerSnapshot = this.engine.snapshots.vault.getLast()

    return { serverSnapshot, playerSnapshot }
  }

  syncEngineByLocalEngine() {
    const pinballs = this.reconciliationEngine.game.world.pinballs
    pinballs.forEach((reconciledPinball) => {
      const enginePinball = this.engine.game.world.pinballs.get(
        reconciledPinball.id
      )

      if (!enginePinball) return

      const positionOffsetX =
        enginePinball.body.position.x - reconciledPinball.body.position.x
      const positionOffsetY =
        enginePinball.body.position.y - reconciledPinball.body.position.y
      const correctionCoeff = 40
      const positionOffsetVector = Matter.Vector.create(
        positionOffsetX,
        positionOffsetY
      )
      const positionError = Matter.Vector.magnitude(positionOffsetVector)

      if (positionError > MAX_LOCAL_POSITION_ERROR) {
        Matter.Body.setPosition(
          enginePinball.body,
          reconciledPinball.body.position
        )
      } else {
        Matter.Body.setPosition(
          enginePinball.body,
          Matter.Vector.create(
            enginePinball.body.position.x - positionOffsetX / correctionCoeff,
            enginePinball.body.position.y - positionOffsetY / correctionCoeff
          )
        )
      }

      Matter.Body.setVelocity(
        enginePinball.body,
        reconciledPinball.body.velocity
      )
    })
  }

  reconcileEngine() {
    const { serverSnapshot, playerSnapshot } = this.getLatestSnapshots()
    if (!serverSnapshot || !playerSnapshot) return

    this.reconcilePinballs(serverSnapshot, playerSnapshot)
  }

  reconcilePinballs(serverSnapshot: Snapshot, playerSnapshot: Snapshot) {
    let currentServerSnapshot = serverSnapshot
    let currentTime = serverSnapshot.timestamp
    let currentPlayerSnapshot =
      this.reconciliationEngine.snapshots.vault.getClosest(currentTime)

    if (!currentPlayerSnapshot) {
      console.warn(
        `[reconcile ${serverSnapshot.frame}] Cannot find snapshot in client vault closest to time ${currentTime}`
      )
      return
    }

    if (areSnapshotsClose(currentPlayerSnapshot, currentServerSnapshot)) {
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
      const snapshot = this.reconciliationEngine.snapshots.vault.getClosest(cur)
      snapshot && playerSnapshots.push(snapshot)
    }

    this.reconciliationEngine.snapshots.vault.remove(
      this.reconciliationEngine.snapshots.vault.size,
      playerSnapshots.length
    )

    restoreEngineFromSnapshot(
      this.reconciliationEngine,
      currentServerSnapshot,
      {
        restoreNonServerControlled: true,
      }
    )

    while (currentTime < playerSnapshot.timestamp - Engine.MIN_DELTA) {
      currentPlayerSnapshot =
        this.reconciliationEngine.snapshots.vault.getClosest(currentTime)

      if (!currentPlayerSnapshot) {
        console.warn(
          `[reconcile ${serverSnapshot.frame}] Cannot find snapshot in client vault closest to time ${currentTime} (inside loop)`
        )
        currentTime += Engine.MIN_DELTA
        this.reconciliationEngine.update(Engine.MIN_DELTA)
        continue
      }

      currentPlayerSnapshot.events.forEach((event) => {
        const data = JSON.parse(event.data || '')

        switch (event.event) {
          case GameEventName.ACTIVATE_OBJECTS: {
            const typedEventData = data as ActivateObjectsEventData
            console.log('activate objects', typedEventData)
            this.changeObjectsStateInEngine(typedEventData.labels, 'activate')
            break
          }
          case GameEventName.DEACTIVATE_OBJECTS: {
            const typedEventData = data as DeactivateObjectsEventData
            console.log('deactivate objects', typedEventData)
            this.changeObjectsStateInEngine(typedEventData.labels, 'deactivate')
            break
          }
          case GameEventName.PLAYER_LOST_ROUND: {
            console.log('lose round')
            this.handlePlayerLostRoundEvent(data)
            break
          }
        }
      })

      this.reconciliationEngine.game.events =
        currentServerSnapshot?.events.map((event) => ({
          data: JSON.parse(event.data || ''),
          name: event.event,
        })) || []

      currentServerSnapshot = generateSnapshot(this.reconciliationEngine)
      currentTime = currentServerSnapshot.timestamp
      playerSnapshots.push(currentServerSnapshot)
      this.reconciliationEngine.update(Engine.MIN_DELTA)
    }

    playerSnapshots.forEach((snapshot) =>
      this.reconciliationEngine.snapshots.vault.unsafe_addWithoutSort(snapshot)
    )
  }

  handleBeforeUpdate(event: BeforeUpdateEvent) {
    this.handlePressedKeys()
    this.handleReleasedKeys()

    this.reconciliationEngine.update(event.delta)
  }

  update() {
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

    this.addPlayerToEngine(this.reconciliationEngine, schemaPlayer)
    this.addPlayerToEngine(this.engine, schemaPlayer)
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
    this.changeObjectsStateInEngine(labels, 'activate')
  }

  handleDeactivateObjects(labels: string[]) {
    this.room?.send(GameEventName.DEACTIVATE_OBJECTS, labels)
    this.changeObjectsStateInEngine(labels, 'deactivate')
  }

  changeObjectsStateInEngine(
    labels: string[],
    state: 'activate' | 'deactivate'
  ) {
    if (!this.userId) return

    if (state === 'activate') {
      this.engine.game.handleActivateObjects(labels)
      this.reconciliationEngine.game.handleActivateObjects(labels)
    } else {
      this.engine.game.handleDeactivateObjects(labels)
      this.reconciliationEngine.game.handleDeactivateObjects(labels)
    }

    // const eventName =
    //   GameEventName[state ? 'ACTIVATE_OBJECTS' : 'DEACTIVATE_OBJECTS']
    // const eventData: ActivateObjectsEventData | DeactivateObjectsEventData = {
    //   name: eventName,
    //   frame: this.localEngine.frame,
    //   time: this.localEngine.frameTimestamp,
    //   labels,
    //   playerId: this.userId,
    // }
    // const mapActiveObjects: string[] = []
    // const clientSnapshot = this.localEngine.snapshots.vault.getLast()
    // if (!clientSnapshot) {
    //   console.warn(
    //     'Last client snapshot when changing object state was not found'
    //   )
    //   return
    // }

    // this.localEngine.game.world.map?.activePaddles.forEach((label) => {
    //   mapActiveObjects.push(label)
    // })

    // clientSnapshot.mapActiveObjects = mapActiveObjects
    // clientSnapshot.events.push({
    //   event: eventName,
    //   data: JSON.stringify(eventData),
    // })

    // this.localEngine.snapshots.vault.remove(
    //   this.localEngine.snapshots.vault.size - 1
    // )
    // this.localEngine.snapshots.vault.unsafe_addWithoutSort(clientSnapshot)
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
    this.room?.removeAllListeners()
    this.room = undefined
    this.reconciliationEngine.destroy()
    this.engine.destroy()
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('touchstart', this.onTouchStart)
    window.removeEventListener('touchend', this.onTouchEnd)
  }
}
