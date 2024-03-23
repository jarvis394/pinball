import * as PIXI from 'pixi.js'
import { lerp } from '@pinball/shared'
import { PIXI_CANVAS_CONTAINER_ID } from '../../pages/Game'
import { Engine, Game } from '@pinball/engine'

class Timer extends PIXI.Graphics {
  public static FONT_SIZE = 20
  public static LINE_HEIGHT = 28
  public static PADDING_HORIZONTAL = 16
  public static PADDING_VERTICAL = 2

  engine: Engine
  text?: PIXI.Text

  constructor(engine: Engine) {
    super()
    this.engine = engine
    this.text = new PIXI.Text(this.getText(), {
      fontFamily: 'Open Sans',
      fill: 0xffffff,
      fontWeight: '900',
      fontSize: Timer.FONT_SIZE,
      lineHeight: Timer.LINE_HEIGHT,
      align: 'center',
    })
  }

  init() {
    const { x, y } = this.getPosition()
    this.position.set(x, y)
    if (this.text) {
      this.beginFill(0x111111)
      this.drawRect(
        -Timer.PADDING_HORIZONTAL,
        -Timer.PADDING_VERTICAL,
        this.text.width + Timer.PADDING_HORIZONTAL * 2,
        Timer.LINE_HEIGHT + Timer.PADDING_VERTICAL * 2
      )
      this.endFill()
      this.addChild(this.text)
    }
  }

  getText() {
    const duration = Math.floor(Game.DURATION / 1000)
    const elapsed = Math.floor(this.engine.game.getElapsedTime() / 1000)
    return duration - elapsed
  }

  getPosition() {
    const canvasContainer = document.getElementById(PIXI_CANVAS_CONTAINER_ID)

    if (!canvasContainer) {
      throw new Error(
        'Cannot render Timer component without PIXI canvas container'
      )
    }

    const { width: screenWidth } = canvasContainer.getBoundingClientRect()

    if (!this.engine.game.world.map) {
      throw new Error('Cannot render Timer component without loaded map')
    }

    if (!this.text) {
      throw new Error('Timer: this.text should be initialized')
    }

    return {
      x: screenWidth - this.text.width - 20 - Timer.PADDING_HORIZONTAL,
      y: 16 + Timer.PADDING_VERTICAL,
    }
  }

  update() {
    if (!this.text) {
      throw new Error('Timer: this.text should be initialized')
    }

    if (!this.engine.game.hasStarted) {
      this.alpha = 0
    } else {
      this.alpha = lerp(this.alpha, 1, 0.7)
    }

    const { x, y } = this.getPosition()
    this.position.set(x, y)
    this.text.text = this.getText()
  }
}

export default Timer
