import Matter from 'matter-js'
import Loop from 'mainloop.js'
import { Game } from './Game'

export class Engine {
  static MIN_FPS = 60
  static MIN_DELTA = 1000 / Engine.MIN_FPS
  static GRAVITY = Matter.Vector.create(0, 0.75)

  game: Game
  matterEngine: Matter.Engine
  frame: number
  frameTimestamp: number
  lastDelta: number

  constructor() {
    this.matterEngine = Matter.Engine.create({
      gravity: Engine.GRAVITY,
      constraintIterations: 4,
      positionIterations: 12,
      velocityIterations: 8,
      enableSleeping: false,
    })
    this.game = new Game({
      matterEngine: this.matterEngine,
    })
    this.frame = 0
    this.frameTimestamp = Engine.now()
    this.lastDelta = 0

    // Restitution=1 doesn't work properly in matter.js, below is a workaround.
    // see: https://github.com/liabru/matter-js/issues/394
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    Matter.Resolver._restingThresh = 0.001
  }

  public update(delta: number) {
    if (!this.game.hasStarted) return

    Matter.Engine.update(this.matterEngine, delta)
    this.game.update()
    this.frame += 1
    this.frameTimestamp = Engine.now()
    this.lastDelta = delta
  }

  public start() {
    Loop.setSimulationTimestep(Engine.MIN_DELTA)
    Loop.setUpdate(this.update.bind(this)).start()
  }

  public destroy() {
    Loop.stop()
    Matter.Engine.clear(this.matterEngine)
  }

  public static now() {
    return performance.now() || Date.now()
  }
}
