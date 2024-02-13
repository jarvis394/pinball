import config from '@colyseus/tools'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import { uWebSocketsTransport } from '@colyseus/uwebsockets-transport'
import { GameRoom } from './rooms'

export default config({
  initializeTransport: function () {
    return new uWebSocketsTransport()
  },

  initializeGameServer: (gameServer) => {
    gameServer.define('game', GameRoom)
    gameServer.simulateLatency(100)
  },

  initializeExpress: (app) => {
    if (process.env.NODE_ENV !== 'production') {
      app.use('/', playground)
    }

    app.use('/monitor', monitor())
  },
})