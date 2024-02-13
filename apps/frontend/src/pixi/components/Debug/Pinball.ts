import { Pinball } from '@pinball/shared'
import { ClientEngine } from '../../../models/ClientEngine'
import * as PIXI from 'pixi.js'

export class PinballDebug extends PIXI.Container {
  clientEngine: ClientEngine
  pinballs: Map<string, PIXI.Graphics>

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
    this.pinballs = new Map()
  }

  init() {}

  addPinball(enginePinball: Pinball) {
    const pixiPinball = new PIXI.Graphics()
      .lineStyle(4, 'ff0000', 0.5)
      .drawCircle(0, 0, enginePinball.data.radius)
    pixiPinball.zIndex = 100
    pixiPinball.name = enginePinball.id
    this.pinballs.set(enginePinball.id, pixiPinball)
    this.addChild(pixiPinball)

    return pixiPinball
  }

  update() {
    this.clientEngine.engine.game.world.pinballs.forEach((enginePinball) => {
      let pixiPinball = this.pinballs.get(enginePinball.id)

      if (!pixiPinball) {
        pixiPinball = this.addPinball(enginePinball)
      }

      pixiPinball.position.set(
        enginePinball.body.position.x,
        enginePinball.body.position.y
      )
    })

    this.pinballs.forEach((_, id) => {
      if (!this.clientEngine.engine.game.world.pinballs.has(id)) {
        const childIndex = this.children.findIndex((e) => e.name === id)
        if (childIndex < 0) return

        this.pinballs.delete(id)
        this.removeChildAt(childIndex)
      }
    })
  }
}
