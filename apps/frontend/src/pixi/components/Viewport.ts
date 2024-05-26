import Matter from 'matter-js'
import { Viewport as PixiViewport } from 'pixi-viewport'
import { Container } from 'pixi.js'
import { MATTER_CANVAS_ID } from '../../pages/Game'
import Application from '../Application'
import { ENABLE_DEBUG_OVERLAY } from '../../config/constants'
import { ClientEngine } from '../../models/ClientEngine'

class Viewport {
  public static PADDING = 16

  app: Application
  clientEngine: ClientEngine
  root: PixiViewport
  viewportPosition: Matter.Vector
  viewportScale: number
  matterRender?: Matter.Render
  bounds: Matter.Bounds
  screenWidth: number
  screenHeight: number
  worldWidth: number
  worldHeight: number

  private resizeObserver: ResizeObserver

  constructor(app: Application, clientEngine: ClientEngine) {
    this.app = app
    this.clientEngine = clientEngine

    const { width: screenWidth, height: screenHeight } =
      app.canvas.getBoundingClientRect()
    const { x: worldWidth, y: worldHeight } =
      this.clientEngine.engine.game.world.map?.data.bounds || {}
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.worldWidth = worldWidth || 0
    this.worldHeight = worldHeight || 0

    // Resize app on pixi container resize
    this.resizeObserver = new ResizeObserver(this.handleResize.bind(this))
    this.resizeObserver.observe(app.canvas)

    const { x, y, scale } = this.getViewportDimensions()
    this.viewportPosition = { x, y }
    this.viewportScale = scale
    this.root = new PixiViewport({
      events: app.renderer.events,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
    })
    this.bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      { x: this.screenWidth, y: 0 },
      {
        x: this.screenWidth,
        y: this.screenHeight,
      },
      { x: 0, y: this.screenHeight },
    ])

    const canvas = document.getElementById(MATTER_CANVAS_ID)

    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return

    if (ENABLE_DEBUG_OVERLAY) {
      this.matterRender = Matter.Render.create({
        engine: this.clientEngine.engine.matterEngine,
        canvas: canvas,
        bounds: this.bounds,
        options: {
          width: this.screenWidth,
          height: this.screenHeight,
          background: 'transparent',
          wireframeBackground: 'transparent',
          wireframes: true,
          showAngleIndicator: true,
          showVelocity: true,
          pixelRatio: window.devicePixelRatio || 1,
          showPerformance: true,
          showStats: true,
          hasBounds: true,
        },
      })

      this.matterRender.canvas.style.setProperty('width', '100%')
      this.matterRender.canvas.style.setProperty('height', '100%')
      this.translateMatterRender()

      Matter.Render.run(this.matterRender)
    }
  }

  update() {
    if (ENABLE_DEBUG_OVERLAY) {
      this.translateMatterRender()
    }
  }

  handleResize(e: ResizeObserverEntry[]) {
    const rect = e[0]?.contentRect
    if (!rect) return

    const { width, height } = rect
    this.screenWidth = width
    this.screenHeight = height
    const { x, y, scale } = this.getViewportDimensions()
    this.viewportPosition = { x, y }
    this.viewportScale = scale
    this.root.resize(width, height)
    this.root.setZoom(scale, true)
    this.root.animate({
      time: 0,
      position: this.viewportPosition,
      scale: this.viewportScale,
      ease: 'linear',
      removeOnInterrupt: false,
    })
  }

  translateMatterRender() {
    const scale = this.viewportScale

    if (!this.matterRender) return

    this.bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      {
        x: this.screenWidth / scale,
        y: 0,
      },
      {
        x: this.screenWidth / scale,
        y: this.screenHeight / scale,
      },
      {
        x: 0,
        y: this.screenHeight / scale,
      },
    ])

    Matter.Bounds.translate(this.bounds, {
      x: -this.root.position.x / scale,
      y: -this.root.position.y / scale,
    })

    this.matterRender.bounds = this.bounds
  }

  init() {
    if (!this.clientEngine.engine.game.world.map) {
      throw new Error('Cannot init Viewport component without loaded map')
    }

    const { x: worldWidth, y: worldHeight } =
      this.clientEngine.engine.game.world.map.data.bounds
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight

    this.root.moveCenter(this.screenWidth / 2, this.screenHeight / 2)
    this.root.fit(true)
  }

  getViewportDimensions() {
    const x = this.worldWidth / 2
    const y = this.worldHeight / 2
    const largestWorldSide =
      Math.max(this.worldWidth, this.worldHeight) + Viewport.PADDING * 2
    let scale = Math.min(this.screenHeight / largestWorldSide, 1)

    // Ajust to a very narrow screen
    if (this.screenWidth < this.worldWidth * scale) {
      scale = this.screenWidth / this.worldWidth
    }

    return { x, y, scale }
  }

  get children() {
    return this.root.children
  }

  addChild(...children: Container[]) {
    return this.root.addChild(...children)
  }

  removeChild(...children: Container[]) {
    return this.root.removeChild(...children)
  }

  destroy() {
    this.root.destroy()
    this.resizeObserver.disconnect()
  }

  disconnectResizeObserver() {
    this.resizeObserver.disconnect()
  }
}

export default Viewport
