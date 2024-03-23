import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { matchMaker } from 'colyseus'
import { MatchmakingGetRoomReq } from '@pinball/shared'
import { GameRoom } from '@pinball/multiplayer-rooms'

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name)

  constructor(private readonly prisma: PrismaService) {}

  async queueRoom(userId: number, data: MatchmakingGetRoomReq) {
    try {
      const options = {
        userId: userId.toString(),
      }
      const reservation = await matchMaker.joinOrCreate(GameRoom.name, options)
      const room = matchMaker.getRoomById(reservation.room.roomId)
      room.setMetadata({ singleplayer: data.singleplayer || false })

      return { success: true, reservation }
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(e)
    }
  }
}
