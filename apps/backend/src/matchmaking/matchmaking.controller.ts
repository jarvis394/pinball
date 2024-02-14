import { Controller, Get, Request } from '@nestjs/common'
import { MatchmakingService } from './matchmaking.service'
import { RequestWithUser } from '../auth/auth.guard'
import { MatchmakingGetRoomRes } from '@pinball/shared'

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Get()
  async queueRoom(
    @Request() req: RequestWithUser
  ): Promise<MatchmakingGetRoomRes> {
    return await this.matchmakingService.queueRoom(req.user.vkUserId)
  }
}
