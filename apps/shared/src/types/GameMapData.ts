import Matter from 'matter-js'

export enum GameMapObjectType {
  WALL = 'wall',
  RESET = 'reset',
  BUMPER = 'bumper',
  PADDLE = 'paddle',
  REDEPLOY_BALL = 'redeploy_ball',
}

export enum GameMapParseType {
  SVG = 'svg',
  GENERIC = 'generic',
  VERTICES = 'vertices',
}

export interface GameMapObjectBaseSVG {
  id: string
  parseType: GameMapParseType.SVG
  objectType: GameMapObjectType
  data: {
    path: string
  }
}

export interface GameMapObjectBaseVertices {
  id: string
  parseType: GameMapParseType.VERTICES
  objectType: GameMapObjectType
  data: {
    points: Matter.Vector[]
  }
}

export interface GameMapObjectBaseGeneric {
  id: string
  parseType: GameMapParseType.GENERIC
  objectType: GameMapObjectType
  data:
    | {
        type: 'rectangle'
        width: number
        height: number
        chamferRadius?: number
      }
    | {
        type: 'circle'
        radius: number
      }
}

export type GameMapObjectBase =
  | GameMapObjectBaseSVG
  | GameMapObjectBaseGeneric
  | GameMapObjectBaseVertices

export type Wall = GameMapObjectBase & {
  objectType: GameMapObjectType.WALL
}

export type Reset = GameMapObjectBase & {
  objectType: GameMapObjectType.RESET
}

export type Bumper = GameMapObjectBase & {
  objectType: GameMapObjectType.BUMPER
  /** Количество очков, которое даётся при касании */
  points: number
}

export type Paddle = GameMapObjectBase & {
  objectType: GameMapObjectType.PADDLE
  anchor: Matter.Vector
}

export type RedeployBall = GameMapObjectBase & {
  objectType: GameMapObjectType.REDEPLOY_BALL
}

export interface GameMapFieldObject {
  label: string
  objectId: string
  data: {
    position: Matter.Vector
    scale?: Matter.Vector
    angleDegrees?: number
    fill?: string
    alpha?: number
    inactiveAngleDegrees?: number
    activeAngleDegrees?: number
  }
}

export interface GameMapPinball {
  position: Matter.Vector
  radius: number
  fill: string
}

export interface GameMapData {
  name: string
  bounds: Matter.Vector
  pinball: GameMapPinball
  objects: GameMapObject[]
  field: GameMapFieldObject[]
}

export type GameMapObject = Wall | Reset | Bumper | Paddle | RedeployBall
