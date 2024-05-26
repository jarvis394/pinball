import { lerp } from '@pinball/shared'
import { ClientEngine } from '../../../models/ClientEngine'
import * as PIXI from 'pixi.js'
import Application from '../../Application'
import PIXIObject from '../../PIXIObject'
import Matter from 'matter-js'
import { Engine } from '@pinball/engine'

export class NetworkPingDebug extends PIXIObject {
  public static FONT_SIZE = 20
  public static LINE_HEIGHT = 28
  public static MARGIN_HORIZONTAL = 16
  public static MARGIN_VERTICAL = 16 + 32 // 32 is height of Timer component
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
      -this.app.screen.width + NetworkPingDebug.MARGIN_HORIZONTAL,
      -NetworkPingDebug.MARGIN_VERTICAL
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
        fontSize: NetworkPingDebug.FONT_SIZE,
        lineHeight: NetworkPingDebug.LINE_HEIGHT,
      }),
    })

    const position = this.getTextPosition(text)
    text.anchor.set(0.5, 0.5)
    text.position.set(position.x, position.y)

    return text
  }

  getTextPosition(text: PIXI.Text): Matter.Vector {
    return {
      x: -text.width / 2 - NetworkPingDebug.PADDING_HORIZONTAL,
      y: NetworkPingDebug.PADDING_VERTICAL + NetworkPingDebug.LINE_HEIGHT / 2,
    }
  }

  createBackground() {
    const textWidth = this.text.width
    const width = textWidth + NetworkPingDebug.PADDING_HORIZONTAL * 2
    const height =
      NetworkPingDebug.LINE_HEIGHT + NetworkPingDebug.PADDING_VERTICAL * 2
    const background = new PIXI.Graphics()
      .rect(0, 0, width, height)
      .fill(0x111111)

    background.pivot.set(width, 0)
    background.zIndex = -1

    return background
  }

  updateBackground() {
    const textWidth = this.text.width
    const width = textWidth + NetworkPingDebug.PADDING_HORIZONTAL * 2
    this.background.width = width
  }

  updateText() {
    this.text.text = this.getText()
    const position = this.getTextPosition(this.text)
    this.text.position.set(position.x, position.y)
  }

  getText() {
    return this.clientEngine.serverSnapshots.timeOffset + 'ms'
  }

  override update() {
    this.updateAlpha()
    this.updateText()
    this.updateBackground()
  }
}

export class NetworkDebug extends PIXIObject {
  clientEngine: ClientEngine
  pingDebug: NetworkPingDebug

  constructor(app: Application, clientEngine: ClientEngine) {
    super(app)
    this.clientEngine = clientEngine
    this.pingDebug = new NetworkPingDebug(app, clientEngine)

    this.addChild(this.pingDebug)
  }

  override async init() {
    await this.pingDebug.init()
  }

  override update() {
    this.pingDebug.update()
  }
}
