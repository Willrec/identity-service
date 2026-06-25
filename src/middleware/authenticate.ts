/* eslint-disable @typescript-eslint/no-namespace */
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError.js';
import { HttpError } from '../shared/errors/HttpError.js';
import { TokenService as JwtTokenService } from '../infrastructure/security/jwt.js';
import type { UserStatus } from '../shared/types/domain.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        status: UserStatus;
      };
    }
  }
}

const jwtTokenService = new JwtTokenService();

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw HttpError.Unauthorized('Missing authorization header', 'MISSING_TOKEN');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw HttpError.Unauthorized('Invalid authorization header format', 'INVALID_TOKEN_FORMAT');
    }

    const token = parts[1];
    
    // Validates RS256 signature, issuer, audience, and expiration internally
    const payload = jwtTokenService.verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      status: payload.status as UserStatus,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Invalid token';
      next(HttpError.Unauthorized(errorMessage, 'INVALID_TOKEN'));
    }
  }
};
