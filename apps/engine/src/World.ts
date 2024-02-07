import Matter from 'matter-js'
import { Player } from './Player'
import { EventEmitter } from './EventEmitter'
import { GameMap } from './GameMap'

export enum WorldEvents {
  PLAYER_SPAWN = 'player_spawn',
  PLAYER_DESPAWN = 'player_despawn',
}

type WorldEmitterEvents = {
  [WorldEvents.PLAYER_SPAWN]: (playerId: string) => void
  [WorldEvents.PLAYER_DESPAWN]: (playerId: string) => void
}

export class World extends EventEmitter<WorldEmitterEvents> {
  public static WALL_COLLISION_CATEGORY = 0x0001

  instance: Matter.World
  matterEngine: Matter.Engine
  map: GameMap | null
  players: Map<string, Player> = new Map()

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    super()
    this.instance = matterEngine.world
    this.matterEngine = matterEngine
    this.map = null
  }

  public loadMap(raw: string) {
    this.map = new GameMap(raw, this)
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
    Matter.World.addBody(this.instance, player.pinball)
    return player
  }

  public removePlayer(id: string): boolean {
    const player = this.players.get(id)

    if (!player) return false

    Matter.World.remove(this.instance, player.pinball)
    this.eventEmitter.emit(WorldEvents.PLAYER_DESPAWN, player.id)
    return this.players.delete(id)
  }

  public update() {
    this.players.forEach((player) => {
      player.update()
    })
  }
}
