import Matter from 'matter-js'
import { World, WorldEvents } from './World'
import { Player } from './Player'
import { GameMapData } from '@pinball/shared'

export class Game {
  world: World
  me: Player | null
  hasStarted: boolean

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    this.world = new World({ matterEngine, game: this })
    this.me = null
    this.hasStarted = false

    this.world.addEventListener(
      WorldEvents.BUMPER_HIT,
      ({ object, playerId }) => {
        const player = this.world.players.get(playerId)
        player && this.addPoints(player, object.points)
      }
    )
    this.world.addEventListener(
      WorldEvents.PLAYER_LOST_ROUND,
      (playerId: string) => {
        const player = this.world.players.get(playerId)
        player && this.resetCurrentScore(player)
      }
    )
  }

  startGame() {
    this.hasStarted = true
  }

  stopGame() {
    this.hasStarted = false
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
    if (!this.hasStarted) return

    this.world.update()
  }

  public clear() {
    this.me = null
    this.world.clear()
  }
}
