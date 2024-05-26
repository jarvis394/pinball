import Matter from 'matter-js'
import Loop from 'mainloop.js'
import { Game } from './Game'
import { SnapshotInterpolation } from 'snapshot-interpolation'
import { Snapshot, generateSnapshot } from './Snapshot'

export class Engine {
  static SNAPSHOTS_VAULT_SIZE = 200
  static MIN_FPS = 60
  static MIN_DELTA = 1000 / Engine.MIN_FPS
  static GRAVITY = Matter.Vector.create(0, 0.75)

  game: Game
  matterEngine: Matter.Engine
  frame: number
  frameTimestamp: number
  lastDelta: number
  snapshots: SnapshotInterpolation<Snapshot>

  constructor() {
    this.matterEngine = Matter.Engine.create({
      gravity: Engine.GRAVITY,
      constraintIterations: 4,
      positionIterations: 6,
      velocityIterations: 4,
      enableSleeping: false,
    })
    this.game = new Game({
      engine: this,
    })
    this.frame = 0
    this.frameTimestamp = Engine.now()
    this.lastDelta = 0
    this.snapshots = new SnapshotInterpolation({
      serverFPS: Engine.MIN_FPS,
      vaultSize: Engine.SNAPSHOTS_VAULT_SIZE,
    })

    // Restitution=1 doesn't work properly in matter.js, below is a workaround.
    // see: https://github.com/liabru/matter-js/issues/394
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    Matter.Resolver._restingThresh = 0.001
  }

  public update(delta: number): Snapshot | false {
    if (!this.game.hasStarted || this.game.hasEnded) {
      return false
    }

    Matter.Engine.update(this.matterEngine, delta)
    this.game.update()
    this.frame += 1
    this.frameTimestamp = Engine.now()
    this.lastDelta = delta

    const snapshot = generateSnapshot(this)
    this.snapshots.addSnapshot(snapshot)

    return snapshot
  }

  public start() {
    Loop.setSimulationTimestep(Engine.MIN_DELTA)
    Loop.setUpdate(this.update.bind(this)).start()
  }

  public destroy() {
    Loop.stop()
    Matter.Engine.clear(this.matterEngine)
    this.snapshots.vault.clear()
  }

  public static now() {
    return Date.now()
  }
}
