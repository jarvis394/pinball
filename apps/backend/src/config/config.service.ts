import { Injectable } from '@nestjs/common'
import { ConfigService as BaseConfigService } from '@nestjs/config'

type EnvSchema = {
  BACKEND_PORT: string
  MULTIPLAYER_PORT: string
  DATABASE_URL: string
  VK_APP_SECRET: string
}

@Injectable()
export class ConfigService {
  constructor(private configService: BaseConfigService<EnvSchema>) {}

  get BACKEND_PORT() {
    return this.configService.get('BACKEND_PORT') || 5000
  }

  get MULTIPLAYER_PORT() {
    return this.configService.get('MULTIPLAYER_PORT') || 2567
  }

  get DATABASE_URL() {
    return this.configService.get('DATABASE_URL')
  }

  get VK_APP_SECRET() {
    return this.configService.get('VK_APP_SECRET')
  }
}
