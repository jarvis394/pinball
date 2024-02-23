import { Body, Controller, Post, Request } from '@nestjs/common'
import { MatchmakingService } from './matchmaking.service'
import { RequestWithUser } from '../auth/auth.guard'
import { MatchmakingGetRoomReq, MatchmakingGetRoomRes } from '@pinball/shared'

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post()
  async queueRoom(
    @Request() req: RequestWithUser,
    @Body() body: MatchmakingGetRoomReq
  ): Promise<MatchmakingGetRoomRes> {
    return await this.matchmakingService.queueRoom(req.user.vkUserId, body)
  }
}
