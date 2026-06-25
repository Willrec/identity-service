import { Router, type IRouter } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../../../middleware/validate.js';
import { registerSchema, loginSchema, refreshTokenSchema, verifyEmailSchema, resendVerificationEmailSchema, requestPasswordResetSchema, resetPasswordSchema } from '../validators/auth.validator.js';
import { authenticate } from '../../../middleware/authenticate.js';
import {
  registerRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  verifyEmailRateLimiter,
  resendVerificationRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} from '../../../middleware/rateLimit.js';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../../users/services/user.service.js';
import { PasswordService } from '../services/password.service.js';
import { TokenService } from '../services/token.service.js';
import { TokenService as JwtTokenService } from '../../../infrastructure/security/jwt.js';
import { SessionService } from '../services/session.service.js';
import { AuthRepository } from '../repositories/auth.repository.js';
import { UserRepository } from '../../users/repositories/user.repository.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { DevelopmentNotificationService } from '../../notifications/services/development-notification.service.js';

// Dependency Injection wiring (normally done via DI container like TSyringe/Awilix)
const authRepo = new AuthRepository(prisma);
const userRepo = new UserRepository(prisma);
const passwordService = new PasswordService();
const tokenService = new TokenService(authRepo);
const sessionService = new SessionService(authRepo);
const userService = new UserService(userRepo);
const jwtTokenService = new JwtTokenService();
const notificationService = new DevelopmentNotificationService();

const authService = new AuthService(
  authRepo,
  userService,
  passwordService,
  tokenService,
  sessionService,
  notificationService,
  jwtTokenService
);

const authController = new AuthController(authService);

const router: IRouter = Router();

// Routes
router.post('/register', registerRateLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', loginRateLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', refreshRateLimiter, validateRequest(refreshTokenSchema), authController.refresh);
router.post('/logout', logoutRateLimiter, validateRequest(refreshTokenSchema), authController.logout);
router.post('/verify-email', verifyEmailRateLimiter, validateRequest(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', resendVerificationRateLimiter, validateRequest(resendVerificationEmailSchema), authController.resendVerification);
router.post('/forgot-password', forgotPasswordRateLimiter, validateRequest(requestPasswordResetSchema), authController.forgotPassword);
router.post('/reset-password', resetPasswordRateLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.me);

export { router as authRouter };
