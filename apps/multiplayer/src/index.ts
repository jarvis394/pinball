import { listen } from '@colyseus/tools'
import app from './app.config'
import { MULTIPLAYER_PORT } from './config/constants'

listen(app, MULTIPLAYER_PORT)
