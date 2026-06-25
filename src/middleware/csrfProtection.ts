import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { HttpError } from '../shared/errors/HttpError.js';
import { COOKIES, HEADERS } from '../config/constants.js';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const headerToken = req.headers[HEADERS.CSRF] || req.headers[HEADERS.CSRF.toLowerCase()];
  if (!headerToken || typeof headerToken !== 'string') {
    throw HttpError.Forbidden('Invalid CSRF token', 'INVALID_CSRF_TOKEN');
  }

  const cookieToken = req.cookies[COOKIES.CSRF];
  if (!cookieToken || typeof cookieToken !== 'string') {
    throw HttpError.Forbidden('Invalid CSRF token', 'INVALID_CSRF_TOKEN');
  }

  if (cookieToken.length !== headerToken.length) {
    throw HttpError.Forbidden('Invalid CSRF token', 'INVALID_CSRF_TOKEN');
  }

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );

  if (!isMatch) {
    throw HttpError.Forbidden('Invalid CSRF token', 'INVALID_CSRF_TOKEN');
  }
  
  next();
};
