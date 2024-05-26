import * as PIXI from 'pixi.js'
import { Pinball as EnginePinball } from '@pinball/engine'
import { lerp } from '@pinball/shared'
import PIXIObject from '../../PIXIObject'
import Application from '../../Application'

class Pinball extends PIXIObject {
  circle: PIXI.Graphics
  enginePinball: EnginePinball

  constructor(app: Application, enginePinball: EnginePinball) {
    super(app)
    this.enginePinball = enginePinball
    this.circle = this.createCircle()
    this.addChild(this.circle)
  }

  createCircle() {
    const circle = new PIXI.Graphics()
      .circle(0, 0, this.enginePinball.data.radius)
      .fill(this.enginePinball.data.fill)
    return circle
  }

  override update(_interpolation: number) {
    // TODO: maybe use delta
    const alpha = 0.7
    this.position.set(
      lerp(this.position.x, this.enginePinball.body.position.x, alpha),
      lerp(this.position.y, this.enginePinball.body.position.y, alpha)
    )
  }
}

export default Pinball
