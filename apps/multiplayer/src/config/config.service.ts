import { Injectable } from '@nestjs/common'
import { ConfigService as BaseConfigService } from '@nestjs/config'

type EnvSchema = {
  MULTIPLAYER_PORT: string
  MULTIPLAYER_MICROSERVICE_PORT: string
  DATABASE_URL: string
}

@Injectable()
export class ConfigService {
  constructor(private configService: BaseConfigService<EnvSchema>) {}

  get MULTIPLAYER_PORT() {
    return this.configService.get('MULTIPLAYER_PORT') || 2567
  }

  get MULTIPLAYER_MICROSERVICE_PORT() {
    return this.configService.get('MULTIPLAYER_MICROSERVICE_PORT') || 6000
  }

  get DATABASE_URL() {
    return this.configService.get('DATABASE_URL')
  }
}
