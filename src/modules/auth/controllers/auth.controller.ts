import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { TokenService } from '../services/token.service.js';
import type { RegisterDto, LoginDto, VerifyEmailDto, ResendVerificationEmailDto, RequestPasswordResetDto, ResetPasswordDto } from '../dto/auth.dto.js';
import { HttpError } from '../../../shared/errors/HttpError.js';
import { COOKIES } from '../../../config/constants.js';
import { getRefreshCookieOptions, getCSRFCookieOptions } from '../../../config/cookieOptions.js';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService
  ) { }

  register = async (
    req: Request<unknown, unknown, RegisterDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({
        success: true,
        data: { user: result },
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
      const dto: LoginDto = {
        ...req.body,
        deviceInfo: req.body.deviceInfo ?? {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      };
      
      const result = await this.authService.login(dto);
      const { refreshToken, ...data } = result;
      const csrfToken = this.tokenService.generateCsrfToken();

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.cookie(COOKIES.REFRESH, refreshToken, getRefreshCookieOptions());
      res.cookie(COOKIES.CSRF, csrfToken, getCSRFCookieOptions());

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
      const cookies = (req.cookies || {}) as Record<string, unknown>;
      const token = cookies[COOKIES.REFRESH];
      if (!token || typeof token !== 'string') {
        throw HttpError.Unauthorized('Missing refresh token', 'INVALID_REFRESH_TOKEN');
      }

      const result = await this.authService.refresh(token);
      const { refreshToken, ...data } = result;
      const csrfToken = this.tokenService.generateCsrfToken();

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.cookie(COOKIES.REFRESH, refreshToken, getRefreshCookieOptions());
      res.cookie(COOKIES.CSRF, csrfToken, getCSRFCookieOptions());

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
      const cookies = (req.cookies || {}) as Record<string, unknown>;
      const token = cookies[COOKIES.REFRESH];
      if (typeof token === 'string') {
        await this.authService.logout(token);
      }
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.clearCookie(COOKIES.REFRESH, getRefreshCookieOptions());
      res.clearCookie(COOKIES.CSRF, getCSRFCookieOptions());
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
