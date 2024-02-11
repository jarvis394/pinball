import Matter from 'matter-js'
import { World, WorldEvents } from './World'
import { Player } from './Player'
import { GameMapData } from '@pinball/shared'

export class Game {
  world: World
  me: Player | null

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    this.world = new World({ matterEngine, game: this })
    this.me = null

    this.world.addEventListener(WorldEvents.BUMPER_HIT, ({ object }) => {
      if (!this.me) {
        throw new Error('Cannot add points when no "me" player is set')
      }

      this.addPoints(this.me, object.points)
    })
    this.world.addEventListener(WorldEvents.PLAYER_LOST_ROUND, () => {
      if (!this.me) {
        throw new Error(
          'Cannot reset current points when no "me" player is set'
        )
      }

      this.resetCurrentScore(this.me)
    })
  }

  addPoints(player: Player, points: number) {
    player.addPoints(points)
  }

  resetCurrentScore(player: Player) {
    player.resetCurrentScore()
  }

  loadMap(data: GameMapData) {
    this.world.loadMap(data)
  }

  setMe(player: Player) {
    const worldPlayer = this.world.players.get(player.id)

    if (!worldPlayer) {
      throw new Error(`setMe: Игрок с id ${player.id} не найден`)
    }

    this.me = player
    worldPlayer.isOpponent = false
    worldPlayer.isMe = true
  }

  public update() {
    this.world.update()
  }

  public clear() {
    this.me = null
    this.world.clear()
  }
}
