import { World } from './World'

export type PlayerConstructorProps = {
  id: string
  world: World
}

export class Player {
  id: string
  world: World
  currentScore: number
  highScore: number
  /**
   * Флаг для обозначения игрока врагом. Изначально всегда `true`;
   * для главного игрока нужно ставить `World.setMe(player)`,
   * как и для игроков в команде главного игрока, чтобы изменить значение на `false`
   * @default true
   */
  isOpponent: boolean
  isMe: boolean
  /** Флаг для состояния, когда игрок обновляется по данным с сервера */
  isServerControlled: boolean
  latency: number

  constructor({ id, world }: PlayerConstructorProps) {
    this.id = id
    this.world = world
    this.isOpponent = true
    this.isMe = false
    this.isServerControlled = false
    this.latency = 0
    this.currentScore = 0
    this.highScore = 0
  }

  public setServerControlled(state: boolean) {
    this.isServerControlled = state
  }

  public setLatency(latency: number) {
    this.latency = latency
  }

  public update() {
    if (this.isServerControlled) return
  }

  public addPoints(points: number) {
    this.currentScore += points
    this.highScore = Math.max(this.highScore, this.currentScore)
  }

  public resetCurrentScore() {
    this.currentScore = 0
  }
}
