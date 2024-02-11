import Matter from 'matter-js'
import { Player } from './Player'
import { EventEmitter } from './EventEmitter'
import { GameMap } from './GameMap'
import {
  GameMapData,
  GameMapFieldObject,
  GameMapObjectType,
  Bumper,
} from '@pinball/shared'
import { Pinball } from './Pinball'
import { Game } from './Game'

export enum WorldEvents {
  PLAYER_SPAWN = 'player_spawn',
  PLAYER_DESPAWN = 'player_despawn',
  PLAYER_LOST_ROUND = 'player_lost_round',
  BUMPER_HIT = 'bumper_hit',
  PLAYER_CURRENT_SCORE_CHANGE = 'player_current_score_change',
}

type WorldEmitterEvents = {
  [WorldEvents.PLAYER_SPAWN]: (playerId: string) => void
  [WorldEvents.PLAYER_DESPAWN]: (playerId: string) => void
  [WorldEvents.PLAYER_LOST_ROUND]: () => void
  [WorldEvents.PLAYER_CURRENT_SCORE_CHANGE]: (
    playerId: string,
    newCurrentScore: number
  ) => void
  [WorldEvents.BUMPER_HIT]: (param: {
    object: Bumper
    fieldObject: GameMapFieldObject
  }) => void
}

export class World extends EventEmitter<WorldEmitterEvents> {
  instance: Matter.World
  matterEngine: Matter.Engine
  game: Game
  map: GameMap | null
  players: Map<string, Player> = new Map()
  pinball: Pinball | null

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
    this.pinball = null

    Matter.Events.on(
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
        a.label === Pinball.LABEL ? -1 : 1
      )

      if (pinball && body && pinball?.label === Pinball.LABEL) {
        const fieldObject = this.map.fieldObjects[body.label]
        if (!fieldObject) return

        const object = this.map.objects[fieldObject.objectId]

        switch (object?.objectType) {
          case GameMapObjectType.RESET:
            this.loseRound()
            break
          case GameMapObjectType.REDEPLOY_BALL:
            this.redeployBall()
            break
          case GameMapObjectType.BUMPER:
            this.pingBumper(object, fieldObject)
            break
        }
      }
    })
  }

  public loseRound() {
    if (!this.pinball) return

    this.pinball.reset()
    // this.game.loseRoundForPlayer(this)
    this.eventEmitter.emit(WorldEvents.PLAYER_LOST_ROUND)
  }

  public redeployBall() {
    if (!this.pinball) return

    Matter.Body.setVelocity(this.pinball.body, Pinball.INITIAL_VELOCITY)
  }

  public pingBumper(object: Bumper, fieldObject: GameMapFieldObject) {
    this.eventEmitter.emit(WorldEvents.BUMPER_HIT, { object, fieldObject })
  }

  public loadMap(data: GameMapData) {
    this.map = new GameMap(data, this)
    this.pinball = new Pinball(this)
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

    this.pinball?.update()

    this.map?.update()
  }

  public clear() {
    this.pinball = null
    this.players = new Map()
    this.map?.clear()
    Matter.World.clear(this.instance, false)
  }
}
