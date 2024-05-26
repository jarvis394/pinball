import * as PIXI from 'pixi.js'

export default class Application extends PIXI.Application<
  PIXI.Renderer<HTMLCanvasElement>
> {
  container: HTMLDivElement
  constructor(container: HTMLDivElement) {
    super()

    if (!container) {
      throw new Error('No element for canvas container provided')
    }

    this.container = container
    this.stage.sortableChildren = true
  }

  async initApplication(options?: Partial<PIXI.ApplicationOptions>) {
    await super.init({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      resolution: window.devicePixelRatio || 1,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resizeTo: this.container,
      ...options,
    })

    this.canvas.style.position = 'fixed'
    this.canvas.style.display = 'block'
    this.canvas.style.left = '0px'
    this.canvas.style.top = '0px'
    this.canvas.style.height = '100%'
    this.canvas.style.width = '100%'
    this.canvas.style.zIndex = '0'
  }
}
