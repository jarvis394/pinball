import { BaseError } from '../utils/errors'
import { NextFunction, Request, Response } from 'express'

export const errorsMiddleware = (
  e: Error | BaseError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  const error = e instanceof BaseError ? e : new BaseError(500, e.message)

  if (error.statusCode === 500) {
    console.error(error)
  }

  res
    .status(error.statusCode)
    .send({ error: true, message: error.message, code: error.statusCode })
}
