import { AppError } from './AppError.js';

export const HttpError = {
  BadRequest: (message = 'Bad Request', code = 'BAD_REQUEST') =>
    new AppError(message, 400, code),

  Unauthorized: (message = 'Unauthorized', code = 'UNAUTHORIZED') =>
    new AppError(message, 401, code),

  Forbidden: (message = 'Forbidden', code = 'FORBIDDEN') =>
    new AppError(message, 403, code),

  NotFound: (message = 'Not Found', code = 'NOT_FOUND') =>
    new AppError(message, 404, code),

  Conflict: (message = 'Conflict', code = 'CONFLICT') =>
    new AppError(message, 409, code),

  InternalServer: (message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR') =>
    new AppError(message, 500, code, false),
} as const;
