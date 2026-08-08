class AppError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors; // [{ field, message }]
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = []) { return new AppError(message, 400, errors); }
  static unauthorized(message = 'Unauthorized') { return new AppError(message, 401); }
  static forbidden(message = 'Forbidden') { return new AppError(message, 403); }
  static notFound(message = 'Resource not found') { return new AppError(message, 404); }
  static conflict(message = 'Conflict') { return new AppError(message, 409); }
  static preconditionFailed(message = 'Precondition failed (stale ETag)') { return new AppError(message, 412); }
  static validation(errors = [], message = 'Validation failed.') { return new AppError(message, 422, errors); }
  static tooManyRequests(message = 'Too many requests') { return new AppError(message, 429); }
  static internal(message = 'Internal server error') { return new AppError(message, 500); }
}

module.exports = AppError;
