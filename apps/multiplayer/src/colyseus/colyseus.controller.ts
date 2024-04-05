import { Controller, HttpStatus } from '@nestjs/common'
import { MessagePattern } from '@nestjs/microservices'
import { GAME_ROOM_NAME } from '@pinball/shared'
import { matchMaker } from 'colyseus'

interface MatchmakingQueueRes {
  status: number
  message: 'matchmaking_queue_success'
  data: matchMaker.SeatReservation
}

@Controller('colyseus')
export class ColyseusController {
  @MessagePattern('matchmaking_queue')
  public async queueMatchmaking(params: {
    singleplayer: boolean
    userId: string | number
  }): Promise<MatchmakingQueueRes> {
    const options = {
      userId: params.userId.toString(),
    }
    const reservation = await matchMaker.joinOrCreate(GAME_ROOM_NAME, options)
    const room = matchMaker.getRoomById(reservation.room.roomId)
    room.setMetadata({ singleplayer: params.singleplayer || false })

    return {
      status: HttpStatus.OK,
      message: 'matchmaking_queue_success',
      data: reservation,
    }
  }
}
