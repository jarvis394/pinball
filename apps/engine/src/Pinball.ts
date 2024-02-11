import { GameMapPinball } from '@pinball/shared'
import { World } from './World'
import Matter from 'matter-js'

export class Pinball {
  public static LABEL = 'pinball'
  public static BODY_FRICTION_AIR = 0
  public static BODY_MASS = 0.1
  public static BODY_MAX_SPEED = 20
  public static INITIAL_VELOCITY = Matter.Vector.create(0, -20)

  world: World
  body: Matter.Body
  data: GameMapPinball

  constructor(world: World) {
    this.world = world

    if (!this.world.map) {
      throw new Error('Cannot init pinball: no map is currently loaded')
    }

    this.data = this.world.map.data.pinball
    this.body = Pinball.createBody(this.world.map.data.pinball)
    Matter.World.add(this.world.instance, this.body)
    Matter.Body.setVelocity(this.body, Pinball.INITIAL_VELOCITY)
  }

  public update() {
    Matter.Body.setAngularVelocity(this.body, 0)

    if (Matter.Body.getSpeed(this.body) > Pinball.BODY_MAX_SPEED) {
      Matter.Body.setSpeed(this.body, Pinball.BODY_MAX_SPEED)
    }
  }

  public reset() {
    this.clear()
    this.body = Pinball.createBody(this.data)
    Matter.World.add(this.world.instance, this.body)
    Matter.Body.setVelocity(this.body, Pinball.INITIAL_VELOCITY)
  }

  public clear() {
    Matter.World.remove(this.world.instance, this.body)
  }

  public static createBody(pinball: GameMapPinball) {
    return Matter.Bodies.circle(
      pinball.position.x + pinball.radius,
      pinball.position.y + pinball.radius,
      pinball.radius,
      {
        frictionAir: Pinball.BODY_FRICTION_AIR,
        mass: Pinball.BODY_MASS,
        frictionStatic: 0,
        friction: 0,
        angularVelocity: 0,
        label: Pinball.LABEL,
      }
    )
  }
}
