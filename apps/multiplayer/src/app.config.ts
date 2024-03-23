import config from '@colyseus/tools'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import { uWebSocketsTransport } from '@colyseus/uwebsockets-transport'
import { GameRoom } from './rooms'
import express from 'express'
import cors from 'cors'

export default config({
  initializeTransport: function () {
    return new uWebSocketsTransport()
  },

  initializeGameServer: (gameServer) => {
    gameServer.define(GameRoom.name, GameRoom)
  },

  initializeExpress: (app) => {
    app.use(
      cors({
        origin: '*',
      })
    )

    app.use(express.json({ limit: '10mb', type: 'application/json' }))
    app.use(express.urlencoded({ limit: '10mb', extended: true }))

    app.get('/api/ping', async (_, res) => {
      res.json({
        ok: true,
      })
    })

    if (process.env.NODE_ENV !== 'production') {
      app.use('/', playground)
      app.use('/monitor', monitor())
    }
  },
})
