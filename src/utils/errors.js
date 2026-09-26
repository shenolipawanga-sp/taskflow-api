class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

const badRequest = (message) => new AppError(400, message, 'VALIDATION_ERROR');
const unauthorized = (message = 'authentication required') => new AppError(401, message, 'UNAUTHORIZED');
const notFound = (message = 'resource not found') => new AppError(404, message, 'NOT_FOUND');
const conflict = (message) => new AppError(409, message, 'CONFLICT');

module.exports = { AppError, badRequest, unauthorized, notFound, conflict };
