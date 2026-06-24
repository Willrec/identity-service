import type { Request, Response, NextFunction } from 'express';
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
  } catch (error: any) {
    if (error instanceof HttpError) {
      next(error);
    } else {
      next(HttpError.Unauthorized(error.message || 'Invalid token', 'INVALID_TOKEN'));
    }
  }
};
