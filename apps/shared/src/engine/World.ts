import Matter from 'matter-js'
import { Player } from './Player'
import { EventEmitter } from './EventEmitter'
import { GameMap } from './GameMap'
import {
  GameMapData,
  GameMapFieldObject,
  GameMapObjectType,
  GameMapObjectBumper,
  GameMapName,
} from '@pinball/shared'
import { Pinball } from './Pinball'
import { Game } from './Game'

export enum WorldEvents {
  PLAYER_SPAWN = 'player_spawn',
  PLAYER_DESPAWN = 'player_despawn',
  PINBALL_SPAWN = 'pinball_spawn',
  PLAYER_LOST_ROUND = 'player_lost_round',
  PLAYER_PINBALL_REDEPLOY = 'player_pinball_redeploy',
  BUMPER_HIT = 'bumper_hit',
  PLAYER_CURRENT_SCORE_CHANGE = 'player_current_score_change',
}

type WorldEmitterEvents = {
  [WorldEvents.PLAYER_SPAWN]: (playerId: string) => void
  [WorldEvents.PLAYER_DESPAWN]: (playerId: string) => void
  [WorldEvents.PLAYER_LOST_ROUND]: (playerId: string) => void
  [WorldEvents.PLAYER_PINBALL_REDEPLOY]: (param: {
    playerId: string
    pinballId: string
  }) => void
  [WorldEvents.PINBALL_SPAWN]: (pinballId: string) => void
  [WorldEvents.PLAYER_CURRENT_SCORE_CHANGE]: (
    playerId: string,
    newCurrentScore: number
  ) => void
  [WorldEvents.BUMPER_HIT]: (param: {
    playerId: string
    object: GameMapObjectBumper
    fieldObject: GameMapFieldObject
  }) => void
}

export class World extends EventEmitter<WorldEmitterEvents> {
  instance: Matter.World
  matterEngine: Matter.Engine
  game: Game
  map: GameMap | null
  mapName: GameMapName | null
  players: Map<Player['id'], Player> = new Map()
  /** Key is player's ID */
  pinballs: Map<Player['id'], Pinball> = new Map()
  shouldProcessCollisions: boolean

  constructor({
    matterEngine,
    game,
  }: {
    matterEngine: Matter.Engine
    game: Game
  }) {
    super()
    this.instance = matterEngine.world
    this.matterEngine = matterEngine
    this.game = game
    this.map = null
    this.mapName = null
    this.shouldProcessCollisions = true

    this.enableCollisions()
  }

  public enableCollisions() {
    this.shouldProcessCollisions = true
    Matter.Events.on(
      this.matterEngine,
      'collisionStart',
      this.handleCollision.bind(this)
    )
  }
  public disableCollisions() {
    this.shouldProcessCollisions = false
    Matter.Events.off(
      this.matterEngine,
      'collisionStart',
      this.handleCollision.bind(this)
    )
  }

  private handleCollision(e: Matter.IEventCollision<Matter.Engine>) {
    const { pairs } = e
    pairs.forEach((pair) => {
      if (!this.map) return

      const [pinball, body] = [pair.bodyA, pair.bodyB].sort((a) =>
        Pinball.isPinball(a) ? -1 : 1
      )

      if (pinball && body && Pinball.isPinball(pinball)) {
        const fieldObject = this.map.fieldObjects[body.label]
        if (!fieldObject) return

        const object = this.map.objects[fieldObject.objectId]
        const { playerId } = Pinball.getDataFromLabel(pinball.label)
        const player = playerId && this.players.get(playerId)

        if (!player) return

        switch (object?.objectType) {
          case GameMapObjectType.RESET:
            this.loseRoundForPlayer(player)
            break
          case GameMapObjectType.REDEPLOY_BALL:
            this.redeployBallForPlayer(player)
            break
          case GameMapObjectType.BUMPER:
            this.pingBumperForPlayer(player, object, fieldObject)
            break
        }
      }
    })
  }

  public loseRoundForPlayer(player: Player) {
    const playerPinball = this.pinballs.get(player.id)
    if (!playerPinball) return

    playerPinball.reset()
    // this.game.loseRoundForPlayer(this)
    this.eventEmitter.emit(WorldEvents.PLAYER_LOST_ROUND, player.id)
  }

  public redeployBallForPlayer(player: Player) {
    const playerPinball = this.pinballs.get(player.id)
    if (!playerPinball) return

    Matter.Body.setVelocity(playerPinball.body, Pinball.INITIAL_VELOCITY)
    this.eventEmitter.emit(WorldEvents.PLAYER_PINBALL_REDEPLOY, {
      playerId: player.id,
      pinballId: playerPinball.id,
    })
  }

  public pingBumperForPlayer(
    player: Player,
    object: GameMapObjectBumper,
    fieldObject: GameMapFieldObject
  ) {
    this.eventEmitter.emit(WorldEvents.BUMPER_HIT, {
      playerId: player.id,
      object,
      fieldObject,
    })
  }

  public loadMap(data: GameMapData) {
    this.map = new GameMap(data, this)
    this.mapName = data.name
  }

  public addPlayer(id: string): Player {
    if (!this.map) {
      throw new Error('Cannot add player: no map is currently loaded')
    }

    const player = new Player({
      id,
      world: this,
    })

    this.players.set(player.id, player)
    this.eventEmitter.emit(WorldEvents.PLAYER_SPAWN, player.id)
    return player
  }

  public addPinballForPlayer(id: string, playerId: string): Pinball {
    if (!this.map) {
      throw new Error('Cannot add player: no map is currently loaded')
    }

    const pinball = new Pinball(id, playerId, this)

    this.pinballs.set(pinball.playerId, pinball)
    this.eventEmitter.emit(WorldEvents.PINBALL_SPAWN, pinball.id)
    return pinball
  }

  public removePlayer(id: string): boolean {
    const player = this.players.get(id)

    if (!player) return false

    this.eventEmitter.emit(WorldEvents.PLAYER_DESPAWN, player.id)
    return this.players.delete(id)
  }

  public update() {
    this.players.forEach((player) => {
      player.update()
    })

    this.pinballs.forEach((pinball) => pinball.update())

    this.map?.update()
  }

  public clear() {
    this.pinballs.clear()
    this.players.clear()
    this.map?.clear()
    Matter.World.clear(this.instance, false)
  }
}
