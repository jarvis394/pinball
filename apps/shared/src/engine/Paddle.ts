import {
  GameMapFieldObject,
  GameMapObjectPaddle as GameMapObjectPaddle,
  degreesToRadian,
  lerp,
} from '@pinball/shared'
import Matter from 'matter-js'
import { World } from './World'
import { GameMap } from './GameMap'

export class Paddle {
  public static LEVER_LABLE = 'lever_'
  public static LEVER_OFFSET = 64
  public static LEVER_SIZE = 32
  public static LEVER_STIFFNESS = 0.1

  object: GameMapObjectPaddle
  fieldObject: GameMapFieldObject
  lever: Matter.Body
  body: Matter.Body
  world: World
  /** Angle of the lever in degrees */
  angle: number
  isActive: boolean
  activeAngleDegrees: number
  inactiveAngleDegrees: number

  constructor(
    body: Matter.Body,
    object: GameMapObjectPaddle,
    fieldObject: GameMapFieldObject,
    world: World
  ) {
    if (fieldObject.data.activeAngleDegrees === undefined) {
      throw new Error(
        `No activeAngleDegrees is present in fieldObject "${fieldObject.label}"`
      )
    }
    if (fieldObject.data.inactiveAngleDegrees === undefined) {
      throw new Error(
        `No inactiveAngleDegrees is present in fieldObject "${fieldObject.label}"`
      )
    }

    this.body = body
    this.object = object
    this.fieldObject = fieldObject
    this.world = world
    this.angle =
      fieldObject.data.angleDegrees || fieldObject.data.inactiveAngleDegrees
    this.activeAngleDegrees = fieldObject.data.activeAngleDegrees
    this.inactiveAngleDegrees = fieldObject.data.inactiveAngleDegrees
    this.isActive = false
    this.lever = Matter.Bodies.rectangle(
      0,
      0,
      Paddle.LEVER_SIZE,
      Paddle.LEVER_SIZE,
      {
        isSensor: true,
        isStatic: true,
        label: Paddle.LEVER_LABLE + fieldObject.label,
      }
    )

    this.init()
  }

  init() {
    const initialPosition = Matter.Vector.add(this.body.position, {
      x: -this.body.bounds.min.x,
      y: -this.body.bounds.min.y,
    })
    const position = Matter.Vector.add(
      initialPosition,
      this.fieldObject.data.position
    )
    const anchor = GameMap.getAnchorFromObject(this.object)

    if (!anchor) return

    Matter.Body.setStatic(this.body, false)
    Matter.Body.setMass(this.body, 10)

    const { width, height } = this.getBodyDimensions()
    const leverPosition = this.getLeverPosition()

    Matter.Body.setPosition(this.lever, leverPosition)

    // Pinhole constraint
    Matter.World.addConstraint(
      this.world.instance,
      Matter.Constraint.create({
        bodyA: this.body,
        pointA: Matter.Vector.create(0, 0),
        pointB: Matter.Vector.sub(position, anchor),
        stiffness: 1,
        length: 0,
      })
    )

    // Connection between lever and body
    Matter.World.addConstraint(
      this.world.instance,
      Matter.Constraint.create({
        bodyA: this.body,
        bodyB: this.lever,
        pointA: Matter.Vector.create(
          (width - height) / 2 - Paddle.LEVER_OFFSET,
          0
        ),
        pointB: Matter.Vector.create(),
        stiffness: Paddle.LEVER_STIFFNESS,
        length: 0,
      })
    )

    Matter.World.add(this.world.instance, this.lever)
    this.deactivate()
  }

  activate() {
    this.isActive = true
  }

  deactivate() {
    this.isActive = false
  }

  update() {
    if (this.isActive) {
      this.angle = lerp(this.angle, this.activeAngleDegrees, 0.8)
    } else {
      this.angle = lerp(this.angle, this.inactiveAngleDegrees, 0.5)
    }

    const leverPosition = this.getLeverPosition()
    Matter.Body.setPosition(this.lever, leverPosition)
  }

  private getBodyDimensions() {
    return {
      width: this.body.bounds.max.x - this.body.bounds.min.x,
      height: this.body.bounds.max.y - this.body.bounds.min.y,
    }
  }

  private getLeverPosition() {
    const radians = degreesToRadian(this.angle)
    const anchor =
      GameMap.getAnchorFromObject(this.object) || Matter.Vector.create()

    return Matter.Vector.create(
      this.body.position.x -
        Math.cos(radians) * (Paddle.LEVER_OFFSET - anchor.x * 2),
      this.body.position.y -
        Math.sin(radians) * (Paddle.LEVER_OFFSET - anchor.y * 2)
    )
  }
}
