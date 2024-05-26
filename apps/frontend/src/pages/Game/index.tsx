import React, { useCallback, useEffect, useRef, useState } from 'react'
import Application from '../../pixi/Application'
import useMountEffect from '../../hooks/useMountEffect'
import { GameRoomState } from '@pinball/engine'
import MainLoop from 'mainloop.js'
import MainScene from '../../pixi/scenes/Main'
import * as Colyseus from 'colyseus.js'
import { MULTIPLAYER_URL } from '../../config/constants'
import {
  fetchMatchmakingRoom,
  resetMatchmakingRoom,
  setGameResults,
} from '../../store/matchmaking'
import { useAppDispatch, useAppSelector } from '../../store'
import PlayerInfo from './PlayerInfo'
import {
  ClientEngineEvents,
  ClientEngineGameResultsEventData,
} from '../../models/ClientEngine'
import {
  ClientEnginePlayer,
  ClientEnginePlayerJson,
} from '../../models/ClientEnginePlayer'
import { useNavigate } from 'react-router-dom'
import { setUserElo } from '../../store/user'
import { routes } from '../../config/routes'
import { Button } from '../../components/Button'
import './Game.css'

export const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'
export const PIXI_CANVAS_ID = 'pixi-canvas'
export const MATTER_CANVAS_ID = 'matter-canvas'

type GameProps = {
  singleplayer?: boolean
}

const Game: React.FC<GameProps> = ({ singleplayer }) => {
  const [currentReservationRequestId, setCurrentReservationRequestId] =
    useState('')
  const navigate = useNavigate()
  const userId = useAppSelector((store) => store.user.data?.id)
  const reservationRequestId = useAppSelector(
    (store) => store.matchmaking.currentRequestId
  )
  const bridgeData = useAppSelector((store) => store.user.bridgeData)
  const reservation = useAppSelector((store) => store.matchmaking.reservation)
  const client = useRef(new Colyseus.Client(MULTIPLAYER_URL))
  const [room, setRoom] = useState<Colyseus.Room<GameRoomState>>()
  const dispatch = useAppDispatch()
  const canvasContainer = useRef<HTMLDivElement>(null)
  const canvasElement = useRef<HTMLCanvasElement>(null)
  const app = useRef<Application>()
  const scene = useRef<MainScene>()
  const [opponentPlayer, setOpponentPlayer] = useState<ClientEnginePlayerJson>()
  const [localPlayer, setLocalPlayer] = useState<ClientEnginePlayerJson>()
  const shouldShowCancelSearchButton = !opponentPlayer && !singleplayer

  const updatePlayerData = useCallback(
    async (player: ClientEnginePlayer) => {
      if (player.id === userId?.toString()) {
        setLocalPlayer(player.toJSON())
      } else {
        setOpponentPlayer(player.toJSON())
      }
    },
    [userId]
  )

  const handleGameEndEvent = useCallback(
    (results: ClientEngineGameResultsEventData) => {
      if (!userId) return

      const newElo = results.eloChange[userId]?.elo

      dispatch(resetMatchmakingRoom())
      dispatch(setGameResults(results))

      if (newElo !== undefined) {
        dispatch(setUserElo(newElo))
      }

      navigate(routes.results.path)
    },
    [dispatch, navigate, userId]
  )

  const handleCancel = () => {
    navigate(routes.main.path)
  }

  // Creates PIXI scene
  useEffect(() => {
    if (!room || !app.current) return

    scene.current = new MainScene({
      app: app.current,
      localVKUserData: bridgeData || undefined,
    })

    scene.current.clientEngine.addEventListener(
      ClientEngineEvents.PLAYER_JOIN,
      updatePlayerData
    )
    scene.current.clientEngine.addEventListener(
      ClientEngineEvents.PLAYER_STATS_CHANGE,
      updatePlayerData
    )
    scene.current.clientEngine.addEventListener(
      ClientEngineEvents.LEAVE_ROOM,
      (code) => {
        console.log('Event leave:', code)
      }
    )
    scene.current.clientEngine.addEventListener(
      ClientEngineEvents.GAME_ENDED,
      handleGameEndEvent
    )

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
      MainLoop.stop()
      scene.current?.clientEngine.destroy()
      scene.current?.viewport.disconnectResizeObserver()
      scene.current?.destroy(true)
      room?.connection?.isOpen && room?.leave(true)
    }
  }, [client, updatePlayerData, room, handleGameEndEvent, bridgeData])

  // Creates engine and PIXI application
  useMountEffect(() => {
    const start = async () => {
      if (!canvasContainer.current) {
        throw new Error('No pixi canvas container found in DOM')
      }

      if (!canvasElement.current) {
        throw new Error('No pixi canvas found in DOM')
      }

      app.current = new Application(canvasContainer.current)
      await app.current?.initApplication({
        canvas: canvasElement.current,
      })

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error Need better typings for window object, rewrite
      // Used for PIXI debugging extension
      window.__PIXI_APP__ = app.current
    }

    start()

    return () => {
      app.current?.destroy(true)
    }
  })

  // Requests to server for room reservation
  useMountEffect(() => {
    console.log('Requesting with singleplayer:', singleplayer)
    const request = dispatch(fetchMatchmakingRoom(singleplayer))
    setCurrentReservationRequestId(request.requestId)
  })

  // Connects to room when reservation from server arrives
  useEffect(() => {
    if (!reservation || currentReservationRequestId !== reservationRequestId)
      return

    const consumeReservation = async () => {
      console.log('Reserved seat in room:', reservation)
      const res = await client.current.consumeSeatReservation<GameRoomState>(
        reservation
      )
      setRoom(res)
    }

    consumeReservation()
  }, [currentReservationRequestId, reservation, reservationRequestId])

  return (
    <div className="Game">
      {shouldShowCancelSearchButton && (
        <Button
          variant="primary"
          className="Game__cancelButton"
          onClick={handleCancel}
        >
          отмена
        </Button>
      )}
      {!singleplayer && <PlayerInfo player={opponentPlayer} />}
      <div
        id={PIXI_CANVAS_CONTAINER_ID}
        className="Game__pixiContainer"
        ref={canvasContainer}
      >
        <canvas
          ref={canvasElement}
          id={PIXI_CANVAS_ID}
          className="Game__pixiCanvas"
        />
        <canvas id={MATTER_CANVAS_ID} className="Game__matterCanvas" />
      </div>
      <PlayerInfo reverseRows player={localPlayer} />
    </div>
  )
}

export default React.memo(Game)
