import * as PIXI from 'pixi.js'
import { lerp } from '@pinball/shared'
import { Engine, Game } from '@pinball/engine'
import { ClientEngine } from '../../models/ClientEngine'
import Application from '../Application'
import PIXIObject from '../PIXIObject'
import Matter from 'matter-js'

class Timer extends PIXIObject {
  public static FONT_SIZE = 20
  public static LINE_HEIGHT = 28
  public static MARGIN_HORIZONTAL = 16
  public static MARGIN_VERTICAL = 16
  public static PADDING_HORIZONTAL = 16
  public static PADDING_VERTICAL = 2

  clientEngine: ClientEngine
  text: PIXI.Text
  background: PIXI.Graphics

  constructor(app: Application, clientEngine: ClientEngine) {
    super(app)
    this.clientEngine = clientEngine
    this.sortableChildren = true
    this.text = this.createText()
    this.addChild(this.text)
    this.background = this.createBackground()
    this.addChild(this.background)

    this.pivot.set(
      -this.app.screen.width + Timer.MARGIN_HORIZONTAL,
      -Timer.MARGIN_VERTICAL
    )

    this.updateAlpha()
  }

  updateAlpha() {
    if (this.clientEngine.engine.game.hasStarted) {
      this.alpha = lerp(
        this.alpha,
        1,
        (Engine.MIN_DELTA / this.app.ticker.deltaMS) * 0.01
      )
    } else {
      this.alpha = 0
    }
  }

  createText() {
    const text = new PIXI.Text({
      text: this.getText(),
      style: new PIXI.TextStyle({
        fontFamily: 'Open Sans',
        fill: 0xffffff,
        fontWeight: '900',
        fontSize: Timer.FONT_SIZE,
        lineHeight: Timer.LINE_HEIGHT,
      }),
    })

    const position = this.getTextPosition(text)
    text.anchor.set(0.5, 0.5)
    text.position.set(position.x, position.y)

    return text
  }

  getTextPosition(text: PIXI.Text): Matter.Vector {
    return {
      x: -text.width / 2 - Timer.PADDING_HORIZONTAL,
      y: Timer.PADDING_VERTICAL + Timer.LINE_HEIGHT / 2,
    }
  }

  createBackground() {
    const textWidth = this.text.width
    const width = textWidth + Timer.PADDING_HORIZONTAL * 2
    const height = Timer.LINE_HEIGHT + Timer.PADDING_VERTICAL * 2
    const background = new PIXI.Graphics()
      .rect(0, 0, width, height)
      .fill(0x111111)

    background.pivot.set(width, 0)
    background.zIndex = -1

    return background
  }

  updateBackground() {
    const textWidth = this.text.width
    const width = textWidth + Timer.PADDING_HORIZONTAL * 2
    this.background.width = width
  }

  updateText() {
    this.text.text = this.getText()
    const position = this.getTextPosition(this.text)
    this.text.position.set(position.x, position.y)
  }

  getText() {
    const duration = Math.floor(Game.DURATION / 1000)
    const elapsed = Math.floor(
      this.clientEngine.engine.game.getElapsedTime() / 1000
    )
    return duration - elapsed
  }

  override update() {
    this.updateAlpha()
    this.updateText()
    this.updateBackground()
  }
}

export default Timer
