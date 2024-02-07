import Matter from 'matter-js'
import { World } from './World'
import { exhaustivnessCheck } from '@pinball/shared'
import * as poly2tri from 're-poly2tri'

export interface MapBody {
  id: string
  type: MapCommand.BODY
  points: poly2tri.Point[]
}

export interface MapHole {
  id: string
  /** ID of the parent body */
  parentId: string
  type: MapCommand.HOLE
  points: poly2tri.Point[]
}

export type MapObject = MapBody | MapHole

export enum MapCommand {
  BODY = 'body',
  HOLE = 'hole',
  SPAWN = 'spawn',
}

export class GameMap {
  public static LABEL = 'map'
  /** Raw map data */
  raw: string
  world: World
  bodies: MapBody[]
  holes: Record<string, MapHole[]>
  playerSpawn: Matter.Vector
  composite: Matter.Composite

  constructor(raw: string, world: World) {
    this.raw = raw
    this.world = world

    const { bodies, holes, playerSpawn } = GameMap.parse(this.raw)
    this.bodies = bodies
    this.holes = holes
    this.playerSpawn = playerSpawn
    this.composite = GameMap.createGeometry(this.bodies, this.holes)
    this.addCompositeToWorld()
  }

  public static parse(raw: string): {
    bodies: MapBody[]
    holes: Record<string, MapHole[]>
    playerSpawn: Matter.Vector
  } {
    console.time('GameMap.parse')

    const bodies: MapBody[] = []
    const holes: Record<string, MapHole[]> = {}
    const lines = raw.split('\n')
    const playerSpawn = Matter.Vector.create()
    let currentObject: MapObject | null = null

    const pushCurrentObjectToCorrespondingArray = (obj: MapObject) => {
      switch (obj.type) {
        case MapCommand.BODY:
          bodies.push(obj)
          if (!holes[obj.id]) holes[obj.id] = []
          break
        case MapCommand.HOLE:
          if (!holes[obj.parentId]) holes[obj.parentId] = []
          holes[obj.parentId]!.push(obj)
          break
        default:
          return exhaustivnessCheck(obj)
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!

      // Parse command
      if (line?.startsWith('#')) {
        const commands = line?.split(' ').slice(1) as [
          MapCommand,
          string,
          string?
        ]
        const [type, ...params] = commands

        if (currentObject) {
          pushCurrentObjectToCorrespondingArray(currentObject)
        }

        switch (type) {
          case MapCommand.BODY: {
            const [id] = params
            currentObject = {
              type: MapCommand.BODY,
              id,
              points: [],
            }
            break
          }
          case MapCommand.HOLE: {
            const [id, parentId] = params

            if (!parentId) {
              throw new Error(`Hole object "${id}" does not have "parentId"`)
            }

            currentObject = {
              type: MapCommand.HOLE,
              id,
              parentId,
              points: [],
            }
            break
          }
          case MapCommand.SPAWN: {
            const [x, y] = params
            if (!x || !y) {
              throw new Error('Wrong map data format')
            }

            playerSpawn.x = Number(x)
            playerSpawn.y = Number(y)
            break
          }
          default:
            return exhaustivnessCheck(type)
        }
      }
      // Parse object's point data
      else if (currentObject) {
        const [x, y] = line.split(',')
        if (!x || !y) {
          throw new Error('Wrong map data format')
        }

        const point = new poly2tri.Point(Number(x), Number(y))
        currentObject.points.push(point)
      }
    }

    if (currentObject) {
      pushCurrentObjectToCorrespondingArray(currentObject)
    }

    console.timeEnd('GameMap.parse')

    return { bodies, holes, playerSpawn }
  }

  public static createGeometry(
    bodies: MapBody[],
    holes: Record<string, MapHole[]>
  ): Matter.Composite {
    console.time('GameMap.createGeometry')

    const mapComposite = Matter.Composite.create()

    for (const body of bodies) {
      const bodyHoles = holes[body.id]?.map((hole) => hole.points) || []
      const composite = Matter.Composite.create()

      const sweep = new poly2tri.SweepContext(body.points).addHoles(bodyHoles)
      sweep.triangulate()
      const triangles = sweep.getTriangles()
      const parts = []

      for (let i = 0; i < triangles.length; i++) {
        const triangle = triangles[i]!
        const vertices = triangle.getPoints()
        const matterBody = GameMap.createBody(vertices)
        parts.push(matterBody)
      }

      Matter.Composite.add(
        composite,
        Matter.Body.create({
          parts,
          isStatic: true,
          friction: 0,
          frictionStatic: 0,
          mass: 0,
        })
      )

      Matter.Composite.add(mapComposite, composite)
    }

    console.timeEnd('GameMap.createGeometry')

    return mapComposite
  }

  private addCompositeToWorld() {
    Matter.World.addComposite(this.world.instance, this.composite)
  }

  public static createBody(vertices: Matter.Vector[]): Matter.Body {
    const centreOfMass = Matter.Vertices.centre(vertices)
    const options: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0,
      restitution: 0,
      mass: 0,
      label: GameMap.LABEL,
    }

    return Matter.Bodies.fromVertices(
      centreOfMass.x,
      centreOfMass.y,
      [vertices],
      options
    )
  }
}
