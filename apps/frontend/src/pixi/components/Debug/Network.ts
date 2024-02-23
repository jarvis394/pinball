import { lerp } from '@pinball/shared'
import { ClientEngine } from '../../../models/ClientEngine'
import * as PIXI from 'pixi.js'
import { PIXI_CANVAS_CONTAINER_ID } from '../../../pages/Game'

export class NetworkPingDebug extends PIXI.Graphics {
  public static FONT_SIZE = 20
  public static LINE_HEIGHT = 28
  public static PADDING_HORIZONTAL = 16
  public static PADDING_VERTICAL = 2

  clientEngine: ClientEngine
  text: PIXI.Text

  private screenWidth: number

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
    this.text = new PIXI.Text(this.getText(), {
      fontFamily: 'Open Sans',
      fill: 0xffffff,
      fontWeight: '900',
      fontSize: NetworkPingDebug.FONT_SIZE,
      lineHeight: NetworkPingDebug.LINE_HEIGHT,
      align: 'center',
    })

    const canvasContainer = document.getElementById(PIXI_CANVAS_CONTAINER_ID)

    if (!canvasContainer) {
      throw new Error(
        'Cannot render NetworkPingDebug component without PIXI canvas container'
      )
    }

    const { width: screenWidth } = canvasContainer.getBoundingClientRect()

    this.screenWidth = screenWidth
  }

  init() {
    const { x, y } = this.getPosition()
    this.position.set(x, y)
    if (this.text) {
      this.beginFill(0x111111)
      this.drawRect(
        -NetworkPingDebug.PADDING_HORIZONTAL,
        -NetworkPingDebug.PADDING_VERTICAL,
        this.text.width + NetworkPingDebug.PADDING_HORIZONTAL * 2,
        NetworkPingDebug.LINE_HEIGHT + NetworkPingDebug.PADDING_VERTICAL * 2
      )
      this.endFill()
      this.addChild(this.text)
    }
  }

  getText() {
    return this.clientEngine.snapshots.timeOffset + 'ms'
  }

  getPosition() {
    if (!this.text) {
      throw new Error('NetworkPingDebug: this.text should be initialized')
    }

    return {
      x:
        this.screenWidth -
        this.text.width -
        20 -
        NetworkPingDebug.PADDING_HORIZONTAL,
      y: 16 + 32 + NetworkPingDebug.PADDING_VERTICAL,
    }
  }

  update() {
    if (!this.text) {
      throw new Error('Timer: this.text should be initialized')
    }

    if (!this.clientEngine.engine.game.hasStarted) {
      this.alpha = 0
    } else {
      this.alpha = lerp(this.alpha, 1, 0.7)
    }

    const { x, y } = this.getPosition()
    this.position.set(x, y)
    this.text.text = this.getText()
  }
}

export class NetworkDebug extends PIXI.Container {
  clientEngine: ClientEngine
  pingDebug: NetworkPingDebug

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
    this.pingDebug = new NetworkPingDebug(clientEngine)

    this.addChild(this.pingDebug)
  }

  init() {
    this.pingDebug.init()
  }

  update() {
    this.pingDebug.update()
  }
}
