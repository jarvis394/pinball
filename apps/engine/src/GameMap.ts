import Matter from 'matter-js'
import { World } from './World'
import {
  GameMapData,
  GameMapFieldObject,
  GameMapObject,
  GameMapObjectBaseGeneric,
  GameMapObjectBaseSVG,
  GameMapObjectBaseVertices,
  GameMapObjectType,
  GameMapParseType,
  degreesToRadian,
  exhaustivnessCheck,
} from '@pinball/shared'
import * as decomp from 'poly-decomp-es'
import { pointsOnPath } from 'points-on-path'
import { Paddle } from './Paddle'

Matter.Common.setDecomp(decomp)

export class GameMap {
  public static LABEL = 'map'
  public static MAP_COMPOSITE_LABEL = 'map_composite'
  public static WALL_LABEL = 'wall'
  public static BUMPER_LABEL = 'bumper'
  public static RESET_LABEL = 'reset'
  public static BUMPER_RESTITUTION = 1
  public static WALL_RESTITUTION = 0
  public static PADDLE_RESTITUTION = 0.1
  public static BASE_BODY_OPTIONS: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    friction: 0,
    restitution: 0,
    mass: 0,
    label: GameMap.LABEL,
  }

  world: World
  data: GameMapData
  objects: Record<string, GameMapObject>
  fieldObjects: Record<string, GameMapFieldObject>
  composite: Matter.Composite
  activePaddles: Set<string>
  paddles: Map<string, Paddle>

  constructor(data: GameMapData, world: World) {
    this.world = world
    this.data = data
    this.objects = {}
    this.fieldObjects = {}
    this.paddles = new Map()
    this.activePaddles = new Set()
    this.composite = Matter.Composite.create({
      label: GameMap.MAP_COMPOSITE_LABEL,
    })
    console.time('GameMap.load')
    this.load(data)
    console.timeEnd('GameMap.load')
  }

  /**
   * Парсит игровую карту, добавляя объекты в свой Matter.Composite,
   * который в последствие добавляет в объект World.instance
   */
  public load(data: GameMapData) {
    this.world.instance.bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      { x: data.bounds.x, y: 0 },
      { x: data.bounds.x, y: data.bounds.y },
      { x: 0, y: data.bounds.y },
    ])

    for (const object of data.objects) {
      this.objects[object.id] = object
    }

    for (const fieldObject of data.field) {
      const object = this.objects[fieldObject.objectId]
      this.fieldObjects[fieldObject.label] = fieldObject

      if (!object) {
        throw new Error(
          `Объект "${fieldObject.objectId}" не найден в данных объектах карты "${data.name}"`
        )
      }

      const body = GameMap.createBodyFromObject(object)
      GameMap.setFieldObjectScale(body, object, fieldObject)
      GameMap.setFieldObjectPosition(body, object, fieldObject)
      GameMap.setFieldObjectLabel(body, fieldObject)

      // Paddle's angle is controlled by lever
      if (object.objectType === GameMapObjectType.PADDLE) {
        this.paddles.set(
          fieldObject.label,
          new Paddle(body, object, fieldObject, this.world)
        )
      } else {
        GameMap.setFieldObjectAngle(body, fieldObject)
      }

      Matter.Composite.add(this.composite, body)
    }

    this.addCompositeToWorld()
  }

  public static getAnchorFromObject(object: GameMapObject) {
    return object.objectType === GameMapObjectType.PADDLE
      ? object.anchor
      : undefined
  }

  public static setFieldObjectAngle(
    body: Matter.Body,
    fieldObject: GameMapFieldObject
  ) {
    if (fieldObject.data.angleDegrees) {
      Matter.Body.setAngle(body, degreesToRadian(fieldObject.data.angleDegrees))
    }
  }

  public static setFieldObjectScale(
    body: Matter.Body,
    object: GameMapObject,
    fieldObject: GameMapFieldObject
  ) {
    const anchor = GameMap.getAnchorFromObject(object)

    if (fieldObject.data.scale) {
      Matter.Body.scale(
        body,
        fieldObject.data.scale.x,
        fieldObject.data.scale.y,
        anchor
      )
    }
  }

  public static setFieldObjectPosition(
    body: Matter.Body,
    object: GameMapObject,
    fieldObject: GameMapFieldObject
  ) {
    const anchor = GameMap.getAnchorFromObject(object)

    // Move anchor point if anchor is present
    if (anchor) {
      Matter.Body.setCentre(body, anchor)
    }

    // TODO: magic code
    const initialPosition = Matter.Vector.add(body.position, {
      x: -body.bounds.min.x,
      y: -body.bounds.min.y,
    })
    const position = Matter.Vector.add(
      initialPosition,
      fieldObject.data.position
    )
    Matter.Body.setPosition(body, position)
  }

  public static setFieldObjectLabel(
    body: Matter.Body,
    fieldObject: GameMapFieldObject
  ) {
    body.label = fieldObject.label
  }

  public static createBodyFromGenericData(
    data: GameMapObjectBaseGeneric
  ): Matter.Body {
    let body: Matter.Body

    switch (data.data.type) {
      case 'circle': {
        body = Matter.Bodies.circle(
          0,
          0,
          data.data.radius,
          GameMap.BASE_BODY_OPTIONS
        )
        break
      }
      case 'rectangle': {
        body = Matter.Bodies.rectangle(
          0,
          0,
          data.data.width,
          data.data.height,
          GameMap.BASE_BODY_OPTIONS
        )
        if (data.data.chamferRadius) {
          Matter.Body.setVertices(
            body,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error - Matter.js mistakenly requires other 3 parameters
            Matter.Vertices.chamfer(body.vertices, data.data.chamferRadius)
          )
        }
        break
      }
      default:
        return exhaustivnessCheck(data.data)
    }

    return body
  }

  public static createBodyFromSVG(data: GameMapObjectBaseSVG): Matter.Body {
    const points =
      pointsOnPath(data.data.path)[0]?.map((e) =>
        Matter.Vector.create(e[0], e[1])
      ) || []
    const filteredPoints = [
      ...new Map(points.map((v) => [JSON.stringify(v), v])).values(),
    ]

    const centre = Matter.Vertices.centre(filteredPoints)
    const body = Matter.Bodies.fromVertices(
      centre.x,
      centre.y,
      [filteredPoints],
      GameMap.BASE_BODY_OPTIONS
    )

    return body
  }

  public static createBodyFromVertices(
    data: GameMapObjectBaseVertices
  ): Matter.Body {
    const points = data.data.points
    const centre = Matter.Vertices.centre(points)
    const body = Matter.Bodies.fromVertices(
      centre.x,
      centre.y,
      [points],
      GameMap.BASE_BODY_OPTIONS
    )

    return body
  }

  public static createBodyFromObject(object: GameMapObject): Matter.Body {
    let body: Matter.Body

    switch (object.parseType) {
      case GameMapParseType.GENERIC: {
        body = GameMap.createBodyFromGenericData(object)
        break
      }
      case GameMapParseType.SVG: {
        body = GameMap.createBodyFromSVG(object)
        break
      }
      case GameMapParseType.VERTICES: {
        body = GameMap.createBodyFromVertices(object)
        break
      }
      default:
        return exhaustivnessCheck(object)
    }

    switch (object.objectType) {
      case GameMapObjectType.RESET:
        break
      case GameMapObjectType.REDEPLOY_BALL:
        body.restitution = 0
        break
      case GameMapObjectType.WALL:
        body.restitution = GameMap.WALL_RESTITUTION
        break
      case GameMapObjectType.BUMPER: {
        body.restitution = GameMap.BUMPER_RESTITUTION
        break
      }
      case GameMapObjectType.PADDLE: {
        body.restitution = GameMap.PADDLE_RESTITUTION
        break
      }
      default:
        return exhaustivnessCheck(object)
    }

    return body
  }

  public update() {
    this.paddles.forEach((paddle) => {
      const shouldBeActive = this.activePaddles.has(paddle.fieldObject.label)

      if (shouldBeActive && !paddle.isActive) {
        paddle.activate()
      } else if (!shouldBeActive && paddle.isActive) {
        paddle.deactivate()
      }

      paddle.update()
    })
  }

  public clear() {
    this.paddles = new Map()
    this.objects = {}
    this.activePaddles = new Set()
    Matter.Composite.clear(this.composite, false)
  }

  private addCompositeToWorld() {
    Matter.World.addComposite(this.world.instance, this.composite)
  }
}
