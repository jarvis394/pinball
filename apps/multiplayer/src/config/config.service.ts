import { Injectable, Logger } from '@nestjs/common'
import { ConfigService as BaseConfigService } from '@nestjs/config'

type EnvSchema = {
  MULTIPLAYER_PORT: string
  DATABASE_URL: string
  MULTIPLAYER_LATENCY_SIMULATION_MS: string
  MODE: 'development' | 'production'
}

const VALID_ENV_MODES: Array<EnvSchema['MODE']> = ['development', 'production']

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name)

  constructor(private configService: BaseConfigService<EnvSchema>) {}

  get MULTIPLAYER_PORT(): number {
    return Number(this.configService.get('MULTIPLAYER_PORT')) || 2567
  }

  get DATABASE_URL() {
    return this.configService.get('DATABASE_URL')
  }

  get MODE(): EnvSchema['MODE'] {
    const mode = this.configService.get<EnvSchema['MODE']>('MODE')

    if (!mode || (mode && !VALID_ENV_MODES.includes(mode))) return 'development'

    return mode
  }

  get MULTIPLAYER_LATENCY_SIMULATION() {
    const ms = Number(
      this.configService.get('MULTIPLAYER_LATENCY_SIMULATION_MS')
    )

    if (!ms) return 0
    if (this.MODE !== 'development' && !isNaN(ms)) {
      this.logger.warn(
        'Cannot simulate multiplayer latency: MODE is not "development"'
      )
      this.logger.warn(
        'Do not use MULTIPLAYER_LATENCY_SIMULATION_MS env variable in any other environment'
      )
      return 0
    }
    if (!isNaN(ms) && ms < 0) {
      this.logger.warn(
        `Cannot simulate multiplayer latency: value below zero, got ${ms}`
      )
      return 0
    }

    return ms || 0
  }
}
