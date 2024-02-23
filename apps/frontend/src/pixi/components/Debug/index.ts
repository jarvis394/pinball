import * as PIXI from 'pixi.js'
import { PinballDebug } from './Pinball'
import { ClientEngine } from '../../../models/ClientEngine'
import { NetworkDebug } from './Network'

type PixiObjectAddChildFunction = (
  ...children: PIXI.DisplayObject[]
) => PIXI.DisplayObject

export class Debug extends PIXI.Container {
  pinballDebug: PinballDebug
  networkDebug: NetworkDebug
  clientEngine: ClientEngine

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
    this.pinballDebug = new PinballDebug(clientEngine)
    this.networkDebug = new NetworkDebug(clientEngine)
  }

  addChildrenForViewport(addChild: PixiObjectAddChildFunction) {
    addChild(this.pinballDebug)
  }

  addChildrenForScene(addChild: PixiObjectAddChildFunction) {
    addChild(this.networkDebug)
  }

  init() {
    this.pinballDebug.init()
    this.networkDebug.init()
  }

  update() {
    this.pinballDebug.update()
    this.networkDebug.update()
  }
}
