import { World, WorldEmitterEvents, WorldEvents } from './World'
import { Player } from './Player'
import { Engine } from './Engine'
import { GameMapData } from '@pinball/shared'
import { GameEvent, GameEventName } from './GameEvent'

export class Game {
  /** Game duration in ms */
  public static DURATION = 1000 * 60 * 1 // 1 minute

  world: World
  engine: Engine
  me: Player | null
  hasStarted: boolean
  hasEnded: boolean
  timeStarted: number | null
  events: GameEvent[]

  constructor({ engine }: { engine: Engine }) {
    this.world = new World({ matterEngine: engine.matterEngine, game: this })
    this.engine = engine
    this.me = null
    this.hasStarted = false
    this.hasEnded = false
    this.timeStarted = null
    this.events = []
  }

  public handleBumperHit: WorldEmitterEvents[WorldEvents.BUMPER_HIT] = ({
    object,
    fieldObject,
    playerId,
  }) => {
    const player = this.world.players.get(playerId)
    player && this.addPoints(player, object.points)

    this.events.push(
      new GameEvent(GameEventName.PING_OBJECTS, {
        name: GameEventName.PING_OBJECTS,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        label: fieldObject.label,
        playerId,
      })
    )
  }

  public handlePlayerLostRound(playerId: string) {
    const player = this.world.players.get(playerId)
    player && this.resetCurrentScore(player)

    this.events.push(
      new GameEvent(GameEventName.PLAYER_LOST_ROUND, {
        name: GameEventName.PLAYER_LOST_ROUND,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        playerId,
      })
    )
  }

  public handleActivateObjects(labels: string[]) {
    if (!this.me) return

    labels.forEach((label) => this.world.map?.activePaddles.add(label))

    this.events.push(
      new GameEvent(GameEventName.ACTIVATE_OBJECTS, {
        name: GameEventName.ACTIVATE_OBJECTS,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        labels,
        playerId: this.me.id,
      })
    )
  }

  public handleDeactivateObjects(labels: string[]) {
    if (!this.me) return

    labels.forEach((label) => this.world.map?.activePaddles.delete(label))

    this.events.push(
      new GameEvent(GameEventName.DEACTIVATE_OBJECTS, {
        name: GameEventName.DEACTIVATE_OBJECTS,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        labels,
        playerId: this.me.id,
      })
    )
  }

  public handlePlayerSpawn(id: string) {
    this.events.push(
      new GameEvent(GameEventName.PLAYER_JOIN, {
        name: GameEventName.PLAYER_JOIN,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        playerId: id,
        // TODO: fixme, should probably be a real value
        elo: 0,
      })
    )
  }

  public handlePlayerLeave(id: string) {
    this.events.push(
      new GameEvent(GameEventName.PLAYER_LEFT, {
        name: GameEventName.PLAYER_LEFT,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        playerId: id,
      })
    )
  }

  public startGame() {
    this.hasStarted = true
    this.timeStarted = Engine.now()
    this.events.push(
      new GameEvent(GameEventName.GAME_STARTED, {
        name: GameEventName.GAME_STARTED,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        // TODO: fixme, should probably be a real value
        players: {},
      })
    )
  }

  public addPoints(player: Player, points: number) {
    player.addPoints(points)
  }

  public resetCurrentScore(player: Player) {
    player.resetCurrentScore()
  }

  public loadMap(data: GameMapData) {
    this.world.loadMap(data)
  }

  public setMe(player: Player) {
    const worldPlayer = this.world.players.get(player.id)

    if (!worldPlayer) {
      throw new Error(`setMe: Игрок с id ${player.id} не найден`)
    }

    this.me = player
    worldPlayer.isOpponent = false
    worldPlayer.isMe = true
  }

  public getElapsedTime() {
    return this.timeStarted ? Engine.now() - this.timeStarted : 0
  }

  public shouldEndGame() {
    return this.getElapsedTime() >= Game.DURATION
  }

  public endGame() {
    this.hasEnded = true
    this.events.push(
      new GameEvent(GameEventName.GAME_ENDED, {
        name: GameEventName.GAME_ENDED,
        frame: this.engine.frame,
        time: this.engine.frameTimestamp,
        // TODO: fixme, should probably be a real value
        eloChange: {},
        placements: [],
      })
    )
  }

  public flushEvents() {
    this.events = []
  }

  public update() {
    // this.flushEvents()
    if (!this.hasStarted || this.hasEnded) return

    if (this.shouldEndGame()) {
      this.endGame()
      return
    }

    this.world.update()
  }

  public clear() {
    this.me = null
    this.world.clear()
  }
}
