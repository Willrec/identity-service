import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { RegisterDto, LoginDto } from '../dto/auth.dto.js';

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
        deviceInfo: req.body.deviceInfo ?? {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
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
}
