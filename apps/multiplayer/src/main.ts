import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { ConfigService } from './config/config.service'
import { playground } from '@colyseus/playground'
import { GameRoom } from './colyseus/rooms'
import { Logger } from '@nestjs/common'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { ColyseusService } from './colyseus/colyseus.service'
import { injectDeps } from './utils/injectDeps'
import { GAME_ROOM_NAME } from '@pinball/shared'
import * as http from 'http'
import express from 'express'

async function bootstrap() {
  const expressApp = express()
  const nestApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: Number(process.env.MULTIPLAYER_MICROSERVICE_PORT) || 6000,
      },
    }
  )
  const config = nestApp.get(ConfigService)
  const colyseusService = nestApp.get(ColyseusService)
  const httpServer = http.createServer(expressApp)

  nestApp.enableShutdownHooks()
  nestApp.init()
  expressApp.use('/playground', playground)

  colyseusService.createServer(httpServer)
  colyseusService.defineRoom(GAME_ROOM_NAME, injectDeps(nestApp, GameRoom))

  await colyseusService.listen(config.MULTIPLAYER_PORT)
  await nestApp.listen()
  Logger.log(
    `🚀 Application is running on: http://localhost:${config.MULTIPLAYER_PORT}`
  )
}

bootstrap()
