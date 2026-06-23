import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service.js';
import type { RegisterDto } from '../dto/auth.dto.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
