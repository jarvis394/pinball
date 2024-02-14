import { Module } from '@nestjs/common'
import { MatchmakingService } from './matchmaking.service'
import { MatchmakingController } from './matchmaking.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
  imports: [],
  controllers: [MatchmakingController],
  providers: [MatchmakingService, PrismaService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
