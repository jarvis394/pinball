import React, { useEffect, useRef, useState } from 'react'
import Application from '../../pixi/Application'
import useMountEffect from '../../hooks/useMountEffect'
import { Engine, GameRoomState } from '@pinball/shared'
import './Game.css'
import MainLoop from 'mainloop.js'
import MainScene from '../../pixi/scenes/Main'
import * as Colyseus from 'colyseus.js'
import { MULTIPLAYER_URL } from '../../config/constants'
import { fetchMatchmakingRoom } from '../../store/matchmaking'
import { useAppDispatch, useAppSelector } from '../../store'

export const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'
export const MATTER_CANVAS_ID = 'matter-canvas'

const Game: React.FC = () => {
  const reservation = useAppSelector((store) => store.matchmaking.reservation)
  const client = useRef(new Colyseus.Client(MULTIPLAYER_URL))
  const [room, setRoom] = useState<Colyseus.Room<GameRoomState>>()
  const dispatch = useAppDispatch()
  const canvasContainer = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine>()
  const app = useRef<Application>()
  const scene = useRef<MainScene>()

  useEffect(() => {
    if (!room || !app.current || !engine.current) return

    scene.current = new MainScene({
      app: app.current,
      engine: engine.current,
    })

    scene.current.clientEngine.setClient(client.current)
    scene.current.clientEngine.setRoom(room)
    scene.current.startGame()

    scene.current.init().then(() => {
      if (!scene.current) return

      app.current?.stage.addChild(scene.current)

      MainLoop.setDraw((interpolation) => {
        scene.current?.update(interpolation)
      }).start()
    })

    return () => {
      room.leave(true)
    }
  }, [client, room])

  useMountEffect(() => {
    engine.current = new Engine()

    if (!canvasContainer.current) {
      throw new Error('No pixi canvas container found in DOM')
    }

    app.current = new Application(canvasContainer.current)

    return () => {
      engine.current?.destroy()
      scene.current?.destroy()
      app.current?.destroy(true)
    }
  })

  useMountEffect(() => {
    dispatch(fetchMatchmakingRoom())
  })

  useEffect(() => {
    if (!reservation) return

    const consumeReservation = async () => {
      const res = await client.current.consumeSeatReservation<GameRoomState>(
        reservation
      )
      setRoom(res)
    }

    consumeReservation()
  }, [reservation])

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
