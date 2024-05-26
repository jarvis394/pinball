import * as PIXI from 'pixi.js'
import Application from './Application'

class PIXIObject extends PIXI.Container {
  app: Application

  constructor(app: Application) {
    super()
    this.app = app
  }

  async init() {
    // noop
  }

  update(interpolation: number) {
    console.log('interpolation:', interpolation)
  }
}

export default PIXIObject
