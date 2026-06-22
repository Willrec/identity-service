import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../shared/errors/HttpError.js';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.NotFound(`Route ${req.method} ${req.path} not found`));
}
