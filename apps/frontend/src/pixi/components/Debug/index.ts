import * as PIXI from 'pixi.js'
import { PinballDebug } from './Pinball'
import { ClientEngine } from '../../../models/ClientEngine'
import { NetworkDebug } from './Network'
import Application from '../../Application'
import PIXIObject from '../../PIXIObject'

type PixiObjectAddChildFunction = (
  ...children: PIXI.Container[]
) => PIXI.Container

export class Debug extends PIXIObject {
  clientEngine: ClientEngine
  pinballDebug: PinballDebug
  networkDebug: NetworkDebug

  constructor(app: Application, clientEngine: ClientEngine) {
    super(app)
    this.clientEngine = clientEngine
    this.pinballDebug = new PinballDebug(app, clientEngine)
    this.networkDebug = new NetworkDebug(app, clientEngine)
  }

  addChildrenForViewport(addChild: PixiObjectAddChildFunction) {
    addChild(this.pinballDebug)
  }

  addChildrenForScene(addChild: PixiObjectAddChildFunction) {
    addChild(this.networkDebug)
  }

  override async init() {
    this.pinballDebug.init()
    this.networkDebug.init()
  }

  override update() {
    this.pinballDebug.update()
    this.networkDebug.update()
  }
}
