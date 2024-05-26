import * as PIXI from 'pixi.js'
import { Pinball as EnginePinball } from '@pinball/engine'
import { lerp } from '@pinball/shared'

class Pinball extends PIXI.Graphics {
  enginePinball: EnginePinball

  constructor(enginePinball: EnginePinball) {
    super()
    this.enginePinball = enginePinball
  }

  init() {
    this.circle(0, 0, this.enginePinball.data.radius)
    this.fill(this.enginePinball.data.fill)
  }

  update(_interpolation: number) {
    this.position.set(
      lerp(this.position.x, this.enginePinball.body.position.x, 0.7),
      lerp(this.position.y, this.enginePinball.body.position.y, 0.7)
    )
  }
}

export default Pinball
