import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { ConfigService } from './config/config.service'
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express'
import { GameRoom } from './game/rooms'
import express from 'express'
import http from 'http'
import { GameService } from './game/game.service'

const ROOMS = [GameRoom]

async function bootstrap() {
  const app = express()

  const nestApp = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(app)
  )

  const config = nestApp.get(ConfigService)
  const backendPort = config.BACKEND_PORT
  const multiplayerPort = config.MULTIPLAYER_PORT
  const globalPrefix = 'api'
  nestApp.setGlobalPrefix(globalPrefix)
  nestApp.enableShutdownHooks()
  nestApp.enableCors()
  nestApp.init()

  await nestApp.listen(backendPort)
  Logger.log(
    `🚀 Application is running on: http://localhost:${backendPort}/${globalPrefix}`
  )

  const httpServer = http.createServer(app)
  const gameSvc = nestApp.get(GameService)
  gameSvc.createServer(httpServer)

  ROOMS.forEach((r) => {
    Logger.log(`Registering room: ${r.name}`)
    gameSvc.defineRoom(r.name, r)
  })

  gameSvc.listen(multiplayerPort).then(() => {
    Logger.log(`Colyseus started on port ${multiplayerPort}`)
  })
}

bootstrap()
