import * as PIXI from 'pixi.js'
import { Player as EnginePlayer } from '@pinball/engine'

class PlayerContainer extends PIXI.Container {
  enginePlayer: EnginePlayer

  constructor(enginePlayer: EnginePlayer) {
    super()
    this.enginePlayer = enginePlayer
  }

  init() {
    // noop
  }

  update(_interpolation: number) {
    // const position = this.enginePlayer.body.position
    // this.position.set(
    //   lerp(this.position.x, position.x, 0.8),
    //   lerp(this.position.y, position.y, 0.8)
    // )
    // this.player.update()
    // this.updateSlidingForce()
  }
}

export default PlayerContainer
