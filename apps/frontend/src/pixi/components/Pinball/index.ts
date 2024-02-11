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
    this.beginFill(this.enginePinball.data.fill)
    this.drawCircle(0, 0, this.enginePinball.data.radius)
    this.endFill()
  }

  update(_interpolation: number) {
    const position = this.enginePinball.body.position
    this.position.set(
      lerp(this.position.x, position.x, 0.8),
      lerp(this.position.y, position.y, 0.8)
    )
  }
}

export default Pinball
