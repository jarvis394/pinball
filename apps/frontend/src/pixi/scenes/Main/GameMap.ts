import { Engine } from '@pinball/engine'
import Application from 'src/pixi/Application'
import * as PIXI from 'pixi.js'

class GameMap {
  app: Application
  engine: Engine
  root: PIXI.Graphics

  constructor(app: Application, engine: Engine) {
    this.app = app
    this.engine = engine
    this.root = new PIXI.Graphics()
  }

  render() {
    const map = this.engine.game.world.map

    if (!map) {
      throw new Error('No map loaded when trying to render GameMap in PIXI')
    }

    this.root.lineStyle({
      color: 0xffffff,
      width: 8,
    })
    this.root.beginFill(0xffffff)
    this.root.fill.alpha = 0.12

    for (const body of map.bodies) {
      this.root.drawPolygon(body.points)
      this.root.beginHole()
      const holes = map.holes[body.id] || []
      holes.forEach((hole) => {
        this.root.drawPolygon(hole.points)
      })
      this.root.endHole()
    }

    this.root.endFill()
  }
}

export default GameMap
