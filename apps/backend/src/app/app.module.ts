import { Module } from '@nestjs/common'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '../config/config.module'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { MatchmakingModule } from '../matchmaking/matchmaking.module'
import { GameService } from '../game/game.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    MatchmakingModule,
  ],
  controllers: [AppController],
  providers: [AppService, GameService],
})
export class AppModule {}
