import { Engine } from '@pinball/engine'
import { lerp } from '@pinball/shared'
import Matter from 'matter-js'
import { Viewport as PixiViewport } from 'pixi-viewport'
import { DisplayObject } from 'pixi.js'
import { MATTER_CANVAS_CONTAINER_ID } from '../../../components/App'
import Application from '../../Application'

class Viewport {
  app: Application
  engine: Engine
  root: PixiViewport
  viewportPosition: Matter.Vector
  viewportScale: number
  matterRender?: Matter.Render
  bounds: Matter.Bounds

  constructor(app: Application, engine: Engine) {
    this.app = app
    this.engine = engine

    // Resize viewport on pixi app resize
    this.app.renderer.addListener('resize', (w: number, h: number) => {
      const { scale } = this.getViewportDimensions()
      this.root.resize(w, h)
      this.root.setZoom(scale, true)
    })

    const { x, y, scale } = this.getViewportDimensions()
    this.viewportPosition = { x, y }
    this.viewportScale = scale
    this.root = new PixiViewport({
      events: app.renderer.events,
      worldHeight: window.innerWidth,
      worldWidth: window.innerHeight,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    })
    this.bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      { x: window.innerWidth, y: 0 },
      { x: window.innerWidth, y: window.innerHeight },
      { x: 0, y: window.innerHeight },
    ])

    const canvas = document.getElementById(MATTER_CANVAS_CONTAINER_ID)

    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return

    this.matterRender = Matter.Render.create({
      engine: this.engine.matterEngine,
      canvas: canvas,
      bounds: this.bounds,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: 'transparent',
        wireframeBackground: 'transparent',
        wireframes: true,
        showStats: true,
        showAngleIndicator: true,
        showBounds: true,
        showDebug: true,
        showVelocity: true,
      },
    })

    this.translateMatterRender()
    Matter.Render.run(this.matterRender)
  }

  translateMatterRender() {
    const scale = this.viewportScale

    if (!this.matterRender) return

    this.bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      {
        x: window.innerWidth / scale,
        y: 0,
      },
      {
        x: window.innerWidth / scale,
        y: window.innerHeight / scale,
      },
      {
        x: 0,
        y: window.innerHeight / scale,
      },
    ])

    Matter.Bounds.translate(this.bounds, {
      x: -this.root.position.x / scale,
      y: -this.root.position.y / scale,
    })

    this.matterRender.bounds = this.bounds
  }

  init() {
    this.root.moveCenter(window.innerWidth / 2, window.innerHeight / 2)
    this.root.fit(true)
  }

  fit(_interpolation: number) {
    const { x, y, scale } = this.getViewportDimensions()
    this.viewportPosition = {
      x: lerp(this.viewportPosition.x, x, 0.05),
      y: lerp(this.viewportPosition.y, y, 0.05),
    }
    this.viewportScale = lerp(this.viewportScale, scale, 0.05)

    this.root.animate({
      time: 0,
      position: this.viewportPosition,
      scale: this.viewportScale,
      ease: 'linear',
      removeOnInterrupt: false,
    })

    this.translateMatterRender()
  }

  getViewportDimensions() {
    const viewportPadding = 64

    const minScale = Math.min(
      window.innerWidth / (window.innerWidth + viewportPadding),
      window.innerHeight / (window.innerHeight + viewportPadding)
    )
    const maxScale = Math.min(
      (window.innerWidth / (window.innerWidth + viewportPadding)) * 2,
      (window.innerHeight / (window.innerHeight + viewportPadding)) * 2
    )

    const min: Matter.Vector = {
      x: window.innerWidth * 2,
      y: window.innerHeight * 2,
    }
    const max: Matter.Vector = { x: 0, y: 0 }

    let x = (max.x - min.x) / 2 + min.x
    let y = (max.y - min.y) / 2 + min.y
    let scale = Math.min(
      window.innerWidth / (max.x - min.x + viewportPadding * 2),
      window.innerHeight / (max.y - min.y + viewportPadding * 2)
    )

    if (this.engine.game.world.players.size === 1 && this.engine.game.me) {
      x = window.innerWidth / 2
      y = window.innerHeight / 2
      scale = 1
    }

    if (this.engine.game.world.players.size === 0) {
      x = window.innerWidth / 2
      y = window.innerHeight / 2
      scale = 1
    }

    if (scale < minScale) {
      scale = minScale
    }

    if (scale > maxScale) {
      scale = maxScale
    }

    return { x, y, scale, min, max, minScale, maxScale, viewportPadding }
  }

  get children() {
    return this.root.children
  }

  addChild(...children: DisplayObject[]) {
    return this.root.addChild(...children)
  }

  removeChild(...children: DisplayObject[]) {
    return this.root.removeChild(...children)
  }
}

export default Viewport
