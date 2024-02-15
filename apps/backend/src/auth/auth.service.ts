import { Injectable } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import checkVKSign from '../utils/checkVKSign'

export interface UserData {
  vkUserId: number
  vkAppId: number
  vkPlatform: string
}

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  verify(searchOrParsedUrlQuery: string): UserData {
    return checkVKSign(searchOrParsedUrlQuery, this.configService.VK_APP_SECRET)
  }
}
