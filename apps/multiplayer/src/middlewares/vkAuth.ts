import { NextFunction, Response } from 'express'

import UserRequest from '../interfaces/userRequest'
import { checkVkAuth } from '../utils/checkVkSign'
import { UnauthorizedError } from '../utils/errors'
import { URLSearchParams } from 'url'

export const vkAuthMiddleware = (
  req: UserRequest,
  _: Response,
  next: NextFunction
) => {
  const vkAppSecret = process.env.VK_APP_SECRET
  if (!vkAppSecret) {
    throw new Error('VK_APP_SECRET is not defined')
  }

  const authorization = req.headers.authorization || ''
  if (!authorization) {
    throw new UnauthorizedError('Authorization header is not defined')
  }

  const authString = authorization.slice('Bearer '.length)

  const isValid = checkVkAuth(decodeURIComponent(authString), vkAppSecret)

  if (!isValid) {
    throw new UnauthorizedError('Invalid VK signature')
  }

  const params = new URLSearchParams(authString)

  req.user = {
    id: Number(params.get('vk_user_id')),
  }
  req.appID = Number(params.get('vk_app_id'))
  req.platform = params.get('vk_platform') || undefined

  next()
}
