import React, { useRef } from 'react'
import Application from '../../pixi/Application'
import ScenesController from '../../pixi/ScenesController'
import { SCENES } from '../../pixi/scenes'
import useMountEffect from '../../hooks/useMountEffect'
import { Engine } from '@pinball/shared'
import './Game.css'

export const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'
export const MATTER_CANVAS_ID = 'matter-canvas'

const Game: React.FC = () => {
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
      className="Game__pixiContainer"
      ref={canvasContainer}
    >
      <canvas id={MATTER_CANVAS_ID} className="Game__matterCanvas" />
    </div>
  )
}

export default React.memo(Game)
