import type { Request, Response, NextFunction, CookieOptions } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { RegisterDto, LoginDto, VerifyEmailDto, ResendVerificationEmailDto, RequestPasswordResetDto, ResetPasswordDto } from '../dto/auth.dto.js';
import { HttpError } from '../../../shared/errors/HttpError.js';
import { env } from '../../../config/env.js';
import { REFRESH_TOKEN_TTL_S, REFRESH_COOKIE_NAME } from '../../../config/constants.js';

const getRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: REFRESH_TOKEN_TTL_S * 1000,
  priority: 'high',
} as CookieOptions & { priority: 'high' });

export class AuthController {
  constructor(private readonly authService: AuthService) { }

  register = async (
    req: Request<unknown, unknown, RegisterDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
  login = async (
    req: Request<unknown, unknown, LoginDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Gather device info for session creation
      const dto = {
        ...req.body,
        deviceInfo: req.body.deviceInfo ?? ({
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        } as any),
      };
      
      const result = await this.authService.login(dto);
      const { refreshToken, ...data } = result;

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = req.cookies[REFRESH_COOKIE_NAME];
      if (!token) {
        throw HttpError.Unauthorized('Missing refresh token', 'INVALID_REFRESH_TOKEN');
      }

      const result = await this.authService.refresh(token);
      const { refreshToken, ...data } = result;

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = req.cookies[REFRESH_COOKIE_NAME];
      if (token) {
        await this.authService.logout(token);
      }
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw HttpError.Unauthorized('Unauthorized', 'UNAUTHORIZED');
      }

      const result = await this.authService.getMe(userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (
    req: Request<unknown, unknown, VerifyEmailDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.authService.verifyEmail(req.body.token);
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (
    req: Request<unknown, unknown, ResendVerificationEmailDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.authService.resendVerificationEmail(req.body.email);
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (
    req: Request<unknown, unknown, RequestPasswordResetDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.authService.forgotPassword(req.body.email);
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (
    req: Request<unknown, unknown, ResetPasswordDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.authService.resetPassword(req.body);
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };
}
