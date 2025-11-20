/**
 * Custom error class for application errors.
 * @extends Error
 * @example
 * const error = new AppError('Unauthorized', 401);
 * console.log(error.statusCode); // 401
 * console.log(error.message); // Unauthorized
 *
 * HTTP status code for the error.
 * @type {number}
 * @memberof AppError
 *
 * Creates an instance of AppError.
 * @param {string} message - Error message.
 * @param {number} [statusCode=400] - HTTP status code for the error.
 * @memberof AppError
 */
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

