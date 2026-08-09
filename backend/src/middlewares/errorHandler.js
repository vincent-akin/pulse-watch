const AppError = require('../common/AppError');
const logger = require('../config/logger');

// 404 fallback for unmatched routes.
function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Centralized error handler — every error funnels through the standard error envelope.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error.';
  let errors = err.errors || [];

  // Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    message = 'Validation failed.';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = 'Duplicate value violates a unique constraint.';
    errors = [{ field, message: `${field} already exists.` }];
  }

  // Mongoose invalid ObjectId cast
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier.';
    errors = [{ field: err.path, message: `Invalid value for ${err.path}.` }];
  }

  if (!err.isOperational && statusCode === 500) {
    logger.error('Unhandled error', { err, requestId: req.requestId, path: req.originalUrl });
    if (process.env.NODE_ENV === 'production') message = 'Internal server error.';
  } else {
    logger.warn(message, { requestId: req.requestId, path: req.originalUrl, statusCode });
  }

  res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { notFoundHandler, errorHandler };
