import React, { useRef } from 'react'
import { Engine } from '@pinball/engine'
import Application from '../../pixi/Application'
import ScenesController from '../../pixi/ScenesController'
import { SCENES } from '../../pixi/scenes'
// import { loadAssets } from '../../assets'
import useMountEffect from '../../hooks/useMountEffect'
import axios from 'axios'

export const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'
export const MATTER_CANVAS_CONTAINER_ID = 'matter-container'

const App: React.FC = () => {
  const canvasContainer = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine>()

  useMountEffect(() => {
    engine.current = new Engine()
    const app = new Application(canvasContainer.current)
    const scenesController = new ScenesController(app, engine.current)

    const start = async () => {
      const mapData = (await axios('/map.txt')).data
      engine.current?.game.loadMap(mapData)
      // await loadAssets()
      await scenesController.loadScene(SCENES.MainScene)
    }

    start()

    return () => {
      engine.current?.destroy()
      app.destroy(true)
    }
  })

  return (
    <>
      <div id={PIXI_CANVAS_CONTAINER_ID} ref={canvasContainer} />
      <canvas
        id={MATTER_CANVAS_CONTAINER_ID}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

export default React.memo(App)
