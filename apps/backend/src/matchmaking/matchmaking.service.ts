import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import { MatchmakingGetRoomReq } from '@pinball/shared'
import { ClientGrpc } from '@nestjs/microservices'
import { Observable, firstValueFrom } from 'rxjs'
import { matchMaker } from 'colyseus'

interface ColyseusService {
  queueMatchmaking(data: {
    singleplayer: boolean
    userId: string | number
  }): Observable<matchMaker.SeatReservation>
}

@Injectable()
export class MatchmakingService implements OnModuleInit {
  private readonly logger = new Logger(MatchmakingService.name)
  private colyseusService?: ColyseusService

  constructor(@Inject('MULTIPLAYER_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.colyseusService =
      this.client.getService<ColyseusService>('ColyseusService')
  }

  async queueRoom(userId: number, data: MatchmakingGetRoomReq) {
    if (!this.colyseusService) {
      throw new InternalServerErrorException(
        'Colyseus service is not initialized'
      )
    }

    try {
      const res = await firstValueFrom(
        this.colyseusService.queueMatchmaking({
          userId,
          singleplayer: data.singleplayer || false,
        })
      )

      return {
        success: true,
        reservation: res,
      }
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(e)
    }
  }
}
