import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { APP_GUARD } from '@nestjs/core'
import { AuthGuard } from './auth.guard'
import { ConfigService } from '../config/config.service'

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    ConfigService,
    AuthService,
  ],
})
export class AuthModule {}
