import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { MatchmakingGetRoomReq } from '@pinball/shared'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name)

  constructor(
    @Inject('COLYSEUS_SERVICE')
    private readonly colyseusServiceClient: ClientProxy
  ) {}

  async queueRoom(userId: number, data: MatchmakingGetRoomReq) {
    try {
      const res = await firstValueFrom(
        this.colyseusServiceClient.send('matchmaking_queue', {
          userId,
          singleplayer: data.singleplayer,
        })
      )

      return { success: true, reservation: res.data }
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(e)
    }
  }
}
