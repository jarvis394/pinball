import React, { useRef } from 'react'
import { Engine } from '@pinball/engine'
import Application from '../../pixi/Application'
import ScenesController from '../../pixi/ScenesController'
import { SCENES } from '../../pixi/scenes'
// import { loadAssets } from '../../assets'
import useMountEffect from '../../hooks/useMountEffect'
import { singleplayerMap } from '@pinball/shared'

export const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'
export const MATTER_CANVAS_ID = 'matter-canvas'

const App: React.FC = () => {
  const canvasContainer = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine>()

  useMountEffect(() => {
    engine.current = new Engine()

    if (!canvasContainer.current) {
      throw new Error('No pixi canvas container found in DOM')
    }

    const app = new Application(canvasContainer.current)
    const scenesController = new ScenesController(app, engine.current)

    const start = async () => {
      engine.current?.game.loadMap(singleplayerMap)
      // await loadAssets()
      await scenesController.loadScene(SCENES.MainScene)
    }

    start()

    return () => {
      engine.current?.destroy()
      scenesController.destroy()
      app.destroy(true)
    }
  })

  return (
    <div
      id={PIXI_CANVAS_CONTAINER_ID}
      style={{
        width: '100%',
        height: '100%',
      }}
      ref={canvasContainer}
    >
      <canvas
        id={MATTER_CANVAS_ID}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  )
}

export default React.memo(App)
