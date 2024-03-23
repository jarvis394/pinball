import * as PIXI from 'pixi.js'
import { Pinball as EnginePinball } from '@pinball/engine'

class Pinball extends PIXI.Graphics {
  enginePinball: EnginePinball

  constructor(enginePinball: EnginePinball) {
    super()
    this.enginePinball = enginePinball
  }

  init() {
    this.beginFill(this.enginePinball.data.fill, 1)
    this.drawCircle(0, 0, this.enginePinball.data.radius)
    this.endFill()
  }

  update(_interpolation: number) {
    const position = this.enginePinball.body.position
    this.position.set(position.x, position.y)
  }
}

export default Pinball
