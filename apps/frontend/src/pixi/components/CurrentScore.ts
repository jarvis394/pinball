import * as PIXI from 'pixi.js'
import { Engine } from '@pinball/shared'

class CurrentScore extends PIXI.Graphics {
  public static FONT_SIZE = 96

  engine: Engine
  text?: PIXI.Text

  constructor(engine: Engine) {
    super()
    this.engine = engine
    this.text = new PIXI.Text(this.getText(), {
      fontFamily: 'Open Sans',
      fill: 'rgba(0, 0, 0, 0.24)',
      fontWeight: '900',
      fontSize: CurrentScore.FONT_SIZE,
      lineHeight: CurrentScore.FONT_SIZE,
      align: 'center',
    })
  }

  init() {
    const { x, y } = this.getPosition()
    this.position.set(x, y)
    this.text && this.addChild(this.text)
  }

  getText() {
    return this.engine.game.me?.currentScore || 0
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
