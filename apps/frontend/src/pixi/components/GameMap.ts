import Application from '../../pixi/Application'
import * as PIXI from 'pixi.js'
import {
  GameMapObjectBumper,
  GameMapFieldObject,
  GameMapObjectBaseGeneric,
  GameMapObjectBaseSVG,
  GameMapObjectBaseVertices,
  GameMapObjectType,
  GameMapParseType,
  Engine,
  Paddle as EnginePaddle,
  WorldEvents,
  exhaustivnessCheck,
  lerp,
  pointsOnPath,
} from '@pinball/shared'
import Matter from 'matter-js'
import { ClientEngine } from '../../models/ClientEngine'
import MainLoop from 'mainloop.js'

class GameMap {
  app: Application
  clientEngine: ClientEngine
  root: PIXI.Graphics
  mask?: PIXI.Graphics
  graphicsObjects: Record<string, PIXI.Graphics>
  paddles: Map<string, { graphics: PIXI.Graphics; paddle: EnginePaddle }>
  bumpers: Map<string, { graphics: PIXI.Graphics; bumper: GameMapObjectBumper }>
  activeBumpers: Set<string>

  constructor(app: Application, clientEngine: ClientEngine) {
    this.app = app
    this.clientEngine = clientEngine
    this.graphicsObjects = {}
    this.paddles = new Map()
    this.bumpers = new Map()
    this.activeBumpers = new Set()
    this.root = new PIXI.Graphics()
  }

  drawMapMask() {
    const map = this.clientEngine.engine.game.world.map

    if (!map) {
      throw new Error('No map loaded when trying to render GameMap in PIXI')
    }

    return new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRoundedRect(0, 0, map.data.bounds.x, map.data.bounds.y, 1000)
      .drawRoundedRect(
        0,
        map.data.bounds.y / 2,
        map.data.bounds.x,
        map.data.bounds.y / 2,
        16
      )
      .endFill()
  }

  drawShapeFromGenericData(
    graphics: PIXI.Graphics,
    object: GameMapObjectBaseGeneric,
    _fieldObject: GameMapFieldObject
  ) {
    switch (object.data.type) {
      case 'circle':
        graphics.drawCircle(
          object.data.radius,
          object.data.radius,
          object.data.radius
        )
        break
      case 'rectangle':
        if (object.data.chamferRadius) {
          graphics.drawRoundedRect(
            0,
            0,
            object.data.width,
            object.data.height,
            object.data.chamferRadius
          )
        } else {
          graphics.drawRect(0, 0, object.data.width, object.data.height)
        }
        break
      default:
        return exhaustivnessCheck(object.data)
    }
  }

  drawShapeFromSVG(
    graphics: PIXI.Graphics,
    object: GameMapObjectBaseSVG,
    fieldObject: GameMapFieldObject
  ) {
    const points =
      pointsOnPath(object.data.path)[0]?.map((e) =>
        Matter.Vector.create(e[0], e[1])
      ) || []
    const filteredPoints = [
      ...new Map(points.map((v) => [JSON.stringify(v), v])).values(),
    ]

    graphics.drawPolygon(filteredPoints)
    graphics.position.set(
      fieldObject.data.position.x,
      fieldObject.data.position.y
    )
  }

  drawShapeFromVertices(
    graphics: PIXI.Graphics,
    object: GameMapObjectBaseVertices,
    fieldObject: GameMapFieldObject
  ) {
    graphics.drawPolygon(object.data.points)
    graphics.position.set(
      fieldObject.data.position.x,
      fieldObject.data.position.y
    )
  }

  init() {
    const map = this.clientEngine.engine.game.world.map

    if (!map) {
      throw new Error('No map loaded when trying to render GameMap in PIXI')
    }

    this.root.beginFill(map.data.backgroundFill)
    this.root.drawRect(0, 0, map.data.bounds.x, map.data.bounds.y)
    this.root.endFill()

    map.data.field.forEach((fieldObject) => {
      const object = map.objects[fieldObject.objectId]
      const graphics = new PIXI.Graphics()

      if (!object) {
        throw new Error(
          `Cannot find object "${fieldObject.objectId}" in map when trying to render GameMap in PIXI`
        )
      }

      if (fieldObject.data.fill) {
        graphics.beginFill(fieldObject.data.fill, fieldObject.data.alpha)
      }

      switch (object.parseType) {
        case GameMapParseType.GENERIC: {
          this.drawShapeFromGenericData(graphics, object, fieldObject)
          break
        }
        case GameMapParseType.SVG: {
          this.drawShapeFromSVG(graphics, object, fieldObject)
          break
        }
        case GameMapParseType.VERTICES: {
          this.drawShapeFromVertices(graphics, object, fieldObject)
          break
        }
        default:
          return exhaustivnessCheck(object)
      }

      if (object.objectType === GameMapObjectType.PADDLE) {
        graphics.pivot.set(object.anchor.x, object.anchor.y)
      }

      graphics.position.set(
        fieldObject.data.position.x,
        fieldObject.data.position.y
      )

      if (fieldObject.data.angleDegrees) {
        graphics.angle = fieldObject.data.angleDegrees
      }

      if (fieldObject.data.scale) {
        const { x, y } = fieldObject.data.scale
        graphics.scale.set(x, y)
        graphics.position.set(
          fieldObject.data.position.x + graphics.width * (x === 1 ? 0 : x),
          fieldObject.data.position.y + graphics.height * (y === 1 ? 0 : y)
        )
      }

      if (fieldObject.data.fill) {
        graphics.endFill()
      }

      this.graphicsObjects[fieldObject.label] = graphics
      this.root.addChild(graphics)

      if (object.objectType === GameMapObjectType.PADDLE) {
        this.paddles.set(fieldObject.label, {
          graphics,
          paddle: map.paddles.get(fieldObject.label)!,
        })
      }

      if (object.objectType === GameMapObjectType.BUMPER) {
        this.bumpers.set(fieldObject.label, {
          graphics,
          bumper: object,
        })
      }
    })

    this.mask = this.drawMapMask()
    this.root.mask = this.mask

    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.BUMPER_HIT,
      ({ fieldObject }) => {
        const bumper = this.bumpers.get(fieldObject.label)
        if (!bumper) return

        this.activeBumpers.add(fieldObject.label)
        bumper.graphics.alpha = 0.1
      }
    )
  }

  update() {
    const scale = Engine.MIN_FPS / MainLoop.getFPS()
    this.paddles.forEach((value) => {
      const { paddle, graphics } = value
      graphics.angle = paddle.angle
    })

    this.activeBumpers.forEach((label) => {
      const bumper = this.bumpers.get(label)
      if (!bumper) return

      bumper.graphics.alpha = lerp(bumper.graphics.alpha, 1, 0.05 * scale)
    })
  }
}

export default GameMap
