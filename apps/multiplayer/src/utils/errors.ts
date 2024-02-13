class BaseError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)

    Object.setPrototypeOf(this, new.target.prototype)
    this.name = Error.name
    this.statusCode = statusCode
    Error.captureStackTrace(this)
  }
}

class UnauthorizedError extends BaseError {
  constructor(message = 'Not authorized') {
    super(401, message)
    this.name = UnauthorizedError.name
  }
}

class InvalidParamsError extends BaseError {
  constructor(message = 'Invalid params') {
    super(400, message)
    this.name = UnauthorizedError.name
  }
}

class NotFoundError extends BaseError {
  constructor(message = 'Not found') {
    super(404, message)
    this.name = NotFoundError.name
  }
}

class AlreadyExistsError extends BaseError {
  constructor(message = 'Already Exists') {
    super(409, message)
    this.name = AlreadyExistsError.name
  }
}

class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden') {
    super(403, message)
    this.name = ForbiddenError.name
  }
}

class BadRequestError extends BaseError {
  constructor(message = 'Bad Request') {
    super(400, message)
    this.name = BadRequestError.name
  }
}

class InternalServerError extends BaseError {
  constructor(message = 'Internal server error') {
    super(500, message)
    this.name = BadRequestError.name
  }
}

export {
  BaseError,
  UnauthorizedError,
  NotFoundError,
  AlreadyExistsError,
  ForbiddenError,
  BadRequestError,
  InvalidParamsError,
  InternalServerError,
}
