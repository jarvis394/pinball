import { Request } from 'express'
import * as core from 'express-serve-static-core'

type UserRequest<
  P = core.ParamsDictionary,
  // Соблюдаем контракт Request'а от Express
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ResBody = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ReqBody = any,
  ReqQuery = qs.ParsedQs,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Locals extends Record<string, any> = Record<string, any>
> = Request<P, ResBody, ReqBody, ReqQuery, Locals> & {
  user?: {
    id: number
  }
  appID?: number
  platform?: string
}

export default UserRequest
