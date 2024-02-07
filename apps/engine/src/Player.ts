import Matter from 'matter-js'
import { World } from './World'

export type PlayerConstructorProps = {
  id: string
  world: World
}

export class Player {
  public static LABEL_PREFIX = 'player_'
  public static HITBOX_RADIUS = 8
  public static BODY_FRICTION_AIR = 0.01
  public static BODY_MASS = 1
  public static BODY_COLLISION_CATEGORY = 0x0010

  id: string
  world: World
  pinball: Matter.Body
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
    this.pinball = Player.createBody()
    this.pinball.label = Player.getLabelFromId(id)
    this.isOpponent = true
    this.isMe = false
    this.isServerControlled = false
    this.latency = 0
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

  public static getLabelFromId(id: string) {
    return Player.LABEL_PREFIX + id
  }

  public static getIdFromLabel(label: string) {
    return label.substring(Player.LABEL_PREFIX.length)
  }

  public static isPlayer(body: Matter.Body) {
    return body.label.startsWith(Player.LABEL_PREFIX)
  }

  public static createBody(): Matter.Body {
    return Matter.Bodies.circle(0, 0, Player.HITBOX_RADIUS, {
      frictionAir: Player.BODY_FRICTION_AIR,
      mass: Player.BODY_MASS,
      frictionStatic: 0,
      friction: 0,
      angularVelocity: 0,
      collisionFilter: {
        category: Player.BODY_COLLISION_CATEGORY,
      },
    })
  }
}
