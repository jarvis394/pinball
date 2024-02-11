import * as PIXI from 'pixi.js'
import { Engine } from '@pinball/engine'

class CurrentScore extends PIXI.Graphics {
  public static FONT_SIZE = 96

  engine: Engine
  text?: PIXI.Text

  constructor(engine: Engine) {
    super()
    this.engine = engine
  }

  init() {
    this.text = new PIXI.Text(this.getText(), {
      fontFamily: 'Roboto',
      fill: 'rgba(0, 0, 0, 0.24)',
      fontWeight: '900',
      fontSize: CurrentScore.FONT_SIZE,
      lineHeight: CurrentScore.FONT_SIZE,
      align: 'center',
    })

    const { x, y } = this.getPosition()
    this.position.set(x, y)
    this.addChild(this.text)
  }

  getText() {
    if (!this.engine.game.me) {
      throw new Error(
        'Cannot render CurrentScore component without local player'
      )
    }

    return this.engine.game.me.currentScore
  }

  getPosition() {
    if (!this.engine.game.world.map) {
      throw new Error('Cannot render CurrentScore component without loaded map')
    }

    if (!this.text) {
      throw new Error('CurrentScore: this.text should be initialized')
    }

    const { x, y } = this.engine.game.world.map.data.bounds

    return {
      x: x / 2 - this.text.width / 2,
      y: y / 2 - CurrentScore.FONT_SIZE / 2,
    }
  }

  update() {
    if (!this.text) {
      throw new Error('CurrentScore: this.text should be initialized')
    }

    const { x, y } = this.getPosition()
    this.position.set(x, y)
    this.text.text = this.getText()
  }
}

export default CurrentScore
