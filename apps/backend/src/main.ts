import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { ConfigService } from './config/config.service'
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express'
import express from 'express'

async function bootstrap() {
  const app = express()
  const nestApp = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(app)
  )

  const config = nestApp.get(ConfigService)
  const backendPort = config.BACKEND_PORT
  const globalPrefix = 'api'
  nestApp.setGlobalPrefix(globalPrefix)
  nestApp.enableShutdownHooks()
  nestApp.enableCors()
  nestApp.init()

  await nestApp.listen(backendPort)
  Logger.log(
    `🚀 Application is running on: http://localhost:${backendPort}/${globalPrefix}`
  )
}

bootstrap()
