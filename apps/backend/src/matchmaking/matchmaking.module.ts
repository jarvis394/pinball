import { Module } from '@nestjs/common'
import { MatchmakingService } from './matchmaking.service'
import { MatchmakingController } from './matchmaking.controller'
import { PrismaService } from '../prisma/prisma.service'
import { ClientProxyFactory, Transport } from '@nestjs/microservices'
import { join } from 'path'
import { path as rootPath } from 'app-root-path'

@Module({
  imports: [],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingService,
    PrismaService,
    {
      provide: 'MULTIPLAYER_PACKAGE',
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.GRPC,
          options: {
            package: 'multiplayer',
            protoPath: join(rootPath, 'proto/multiplayer.proto'),
          },
        })
      },
      inject: [],
    },
  ],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
