import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthService, UserData } from './auth.service'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '../config/config.service'

export interface RequestWithUser extends Request {
  user: UserData
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const token = this.extractTokenFromHeader(request)

    if (this.configService.ENABLE_TEST_USER) {
      request['user'] = {
        vkAppId: this.configService.VK_APP_ID,
        vkPlatform: 'vkcom',
        vkUserId: 1,
      }
      return true
    }

    if (!token) {
      throw new UnauthorizedException()
    }

    try {
      const payload = this.authService.verify(token)
      request.user = payload
    } catch {
      throw new UnauthorizedException()
    }

    return true
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
