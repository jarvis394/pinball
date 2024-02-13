import { listen } from '@colyseus/tools'
import app from './app.config'

const DEFAULT_PORT = 2567
const envPort = process.env.MULTIPLAYER_PORT

// Create and listen on 2567 (or PORT environment variable)
listen(app, envPort ? Number(envPort) : DEFAULT_PORT)
