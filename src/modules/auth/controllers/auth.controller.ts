import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { RegisterDto, LoginDto, RefreshTokenDto, VerifyEmailDto, ResendVerificationEmailDto, RequestPasswordResetDto } from '../dto/auth.dto.js';
import { HttpError } from '../../../shared/errors/HttpError.js';

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
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: Request<unknown, unknown, RefreshTokenDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.refresh(req.body.refreshToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: Request<unknown, unknown, RefreshTokenDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.authService.logout(req.body.refreshToken);
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
}
