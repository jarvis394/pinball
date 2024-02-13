import { MapSchema, Schema, type } from '@colyseus/schema'
import { GameEvent } from '../types/GameEvents'
import { GameMapName } from '../types'

export class SchemaVector extends Schema {
  @type('float64') x: number
  @type('float64') y: number

  constructor(x: number, y: number) {
    super()
    this.x = x
    this.y = y
  }
}

export class SchemaPinball extends Schema {
  @type(SchemaVector) position: SchemaVector = new SchemaVector(0, 0)
  @type(SchemaVector) velocity: SchemaVector = new SchemaVector(0, 0)
  @type('string') playerId: string
  @type('string') id: string

  constructor(id: string, playerId: string) {
    super()
    this.id = id
    this.playerId = playerId
  }
}

export class SchemaMap extends Schema {
  @type('string') map: GameMapName = GameMapName.SINGLEPLAYER
  /** Labels of active field objects */
  @type(['string']) activeObjects: string[] = []
  @type({ map: SchemaPinball }) pinballs: MapSchema<SchemaPinball, string> =
    new MapSchema()
}

export class SchemaPlayer extends Schema {
  @type('string') id: string
  @type('uint16') highScore: number = 0
  @type('uint16') currentScore: number = 0
  @type(SchemaMap) map: SchemaMap = new SchemaMap()

  constructor(playerId: string) {
    super()
    this.id = playerId
  }
}

export class SchemaEvent extends Schema {
  @type('string') event: GameEvent
  @type('string') data?: string

  constructor(event: GameEvent) {
    super()
    this.event = event
  }
}

export class GameRoomState extends Schema {
  @type('int64') frame = 0
  @type('int64') time = 0
  @type('string') mapName: GameMapName
  @type([SchemaEvent]) events: SchemaEvent[] = []
  @type({ map: SchemaPlayer }) players: MapSchema<SchemaPlayer, string> =
    new MapSchema()

  constructor(mapName: GameMapName) {
    super()
    this.mapName = mapName
  }
}