import Matter from 'matter-js'
import { World, WorldEvents } from './World'
import { Player } from './Player'
import { Engine } from './Engine'
import { GameMapData } from '@pinball/shared'
import { EventEmitter } from './EventEmitter'

export enum GameEvents {
  GAME_ENDED = 'game_ended',
}

export enum GameResult {
  LOST = 0,
  WON = 1,
}

type GameEmitterEvents = {
  [GameEvents.GAME_ENDED]: () => void
}

export class Game extends EventEmitter<GameEmitterEvents> {
  /** Game duration in ms */
  public static DURATION = 1000 * 60 * 1 // 1 minute

  world: World
  me: Player | null
  hasStarted: boolean
  hasEnded: boolean
  timeStarted: number | null

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    super()
    this.world = new World({ matterEngine, game: this })
    this.me = null
    this.hasStarted = false
    this.hasEnded = false
    this.timeStarted = null

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

  public startGame() {
    this.hasStarted = true
    this.timeStarted = Engine.now()
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
  }

  public update() {
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
