import { Controller, Get, Request } from '@nestjs/common'
import { UserService } from './user.service'
import { RequestWithUser } from '../auth/auth.guard'
import { UserGetSelfRes } from '@pinball/shared'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getSelf(@Request() req: RequestWithUser): Promise<UserGetSelfRes> {
    let result = await this.userService.user({ id: req.user.vkUserId })

    if (!result) {
      result = await this.userService.createUser({
        id: req.user.vkUserId,
        elo: 0,
      })
    }

    return { user: result }
  }
}
