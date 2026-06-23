export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly requestId: string | undefined;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    requestId?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.requestId = requestId;

    Error.captureStackTrace(this, this.constructor);
  }
}
