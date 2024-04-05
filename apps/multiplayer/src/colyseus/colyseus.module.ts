import { Module } from '@nestjs/common'

import { ConfigService } from '../config/config.service'
import { ColyseusService } from './colyseus.service'
import { ColyseusController } from './colyseus.controller'

@Module({
  imports: [],
  controllers: [ColyseusController],
  providers: [ColyseusService, ConfigService],
})
export class ColyseusModule {}
