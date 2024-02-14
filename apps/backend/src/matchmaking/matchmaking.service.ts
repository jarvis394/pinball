import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { matchMaker } from 'colyseus'
import { ClientData } from '../game/rooms/game'

// TODO: move to @pinball/shared and update codebase
const GAME_ROOM_NAME = 'GameRoom'

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name)

  constructor(private readonly prisma: PrismaService) {}

  async queueRoom(userId: number) {
    try {
      const options: ClientData = {
        userId: userId.toString(),
      }
      const reservation = await matchMaker.joinOrCreate(GAME_ROOM_NAME, options)
      return { success: true, reservation }
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(e)
    }
  }
}
