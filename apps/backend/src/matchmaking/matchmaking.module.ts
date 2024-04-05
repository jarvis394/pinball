import { Module } from '@nestjs/common'
import { MatchmakingService } from './matchmaking.service'
import { MatchmakingController } from './matchmaking.controller'
import { PrismaService } from '../prisma/prisma.service'
import { ClientProxyFactory, Transport } from '@nestjs/microservices'
import { ConfigService } from '../config/config.service'

@Module({
  imports: [],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingService,
    PrismaService,
    {
      provide: 'COLYSEUS_SERVICE',
      useFactory: (configService: ConfigService) => {
        return ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: '0.0.0.0',
            port: configService.MULTIPLAYER_MICROSERVICE_PORT,
          },
        })
      },
      inject: [ConfigService],
    },
  ],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
