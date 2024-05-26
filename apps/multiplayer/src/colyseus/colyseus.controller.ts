import { Controller } from '@nestjs/common'
import { GrpcMethod } from '@nestjs/microservices'
import { GAME_ROOM_NAME } from '@pinball/shared'
import { matchMaker } from 'colyseus'

@Controller('colyseus')
export class ColyseusController {
  @GrpcMethod('ColyseusService', 'QueueMatchmaking')
  public async queueMatchmaking(data: {
    singleplayer: boolean
    userId: string | number
  }): Promise<matchMaker.SeatReservation> {
    const options = {
      userId: data.userId.toString(),
    }
    const reservation = await matchMaker.joinOrCreate(GAME_ROOM_NAME, options)
    const room = matchMaker.getRoomById(reservation.room.roomId)
    room.setMetadata({ singleplayer: data.singleplayer || false })
    return reservation
  }
}
