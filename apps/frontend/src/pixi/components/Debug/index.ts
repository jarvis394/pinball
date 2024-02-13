import * as PIXI from 'pixi.js'
import { PinballDebug } from './Pinball'
import { ClientEngine } from '../../../models/ClientEngine'

export class Debug extends PIXI.Container {
  pinballDebug: PinballDebug
  clientEngine: ClientEngine

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
    this.pinballDebug = new PinballDebug(clientEngine)

    this.addChild(this.pinballDebug)
  }

  init() {
    this.pinballDebug.init()
  }

  update() {
    this.pinballDebug.update()
  }
}
