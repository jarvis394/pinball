import { Pinball, Snapshot, WorldEvents } from '@pinball/engine'
import { ClientEngine } from '../../../models/ClientEngine'
import * as PIXI from 'pixi.js'
import Application from '../../Application'
import PIXIObject from '../../PIXIObject'

export class PinballDebug extends PIXIObject {
  clientEngine: ClientEngine
  pinballs: Map<string, PIXI.Container>

  constructor(app: Application, clientEngine: ClientEngine) {
    super(app)
    this.clientEngine = clientEngine
    this.pinballs = new Map()

    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.PINBALL_SPAWN,
      (pinballId) => {
        const enginePinball =
          this.clientEngine.engine.game.world.pinballs.get(pinballId)
        if (!enginePinball) return

        this.addPinball(enginePinball, 'engine')
      }
    )
    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.PINBALL_SPAWN,
      (pinballId) => {
        const enginePinball =
          this.clientEngine.engine.game.world.pinballs.get(pinballId)
        if (!enginePinball) return

        this.addPinball(enginePinball, 'localEngine')
      }
    )
  }

  addPinball(enginePinball: Pinball, label?: string) {
    const id = `${enginePinball.id}${label ? '_' + label : ''}`
    const container = new PIXI.Container()
    const pixiPinball = new PIXI.Graphics()
      .circle(0, 0, enginePinball.data.radius)
      .stroke({
        width: 4,
        color: new PIXI.Color({ h: Math.random() * 360, s: 100, l: 50 }),
        alpha: 0.5,
      })
    const text = new PIXI.Text({
      text: id,
      style: new PIXI.TextStyle({
        fill: 0xffffff,
        fontSize: 12,
        stroke: {
          width: 2,
          color: 0x000000,
        },
      }),
    })

    text.position.set(-text.width / 2, -text.height / 2)

    container.zIndex = 100
    container.label = id
    this.pinballs.set(id, container)
    container.addChild(pixiPinball)
    container.addChild(text)
    this.addChild(container)

    return pixiPinball
  }

  override update() {
    const snapshot = this.clientEngine.engine.snapshots.vault.getLast() as
      | Snapshot
      | undefined
    if (!snapshot) return

    snapshot.state.pinballs.forEach((snapshotPinball) => {
      const pixiPinball = this.pinballs.get(snapshotPinball.id + '_engine')
      if (!pixiPinball) return

      pixiPinball.position.set(
        snapshotPinball.positionX,
        snapshotPinball.positionY
      )
    })

    this.clientEngine.engine.game.world.pinballs.forEach((enginePinball) => {
      const pixiPinball = this.pinballs.get(enginePinball.id + '_localEngine')
      if (!pixiPinball) return

      pixiPinball.position.set(
        enginePinball.body.position.x,
        enginePinball.body.position.y
      )
    })
  }
}
