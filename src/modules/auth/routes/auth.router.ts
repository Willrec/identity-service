import { Router, type IRouter } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../../../middleware/validate.js';
import { registerSchema, loginSchema, refreshTokenSchema, verifyEmailSchema, resendVerificationEmailSchema, requestPasswordResetSchema } from '../validators/auth.validator.js';
import { authenticate } from '../../../middleware/authenticate.js';
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
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refresh);
router.post('/logout', validateRequest(refreshTokenSchema), authController.logout);
router.post('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validateRequest(resendVerificationEmailSchema), authController.resendVerification);
router.post('/forgot-password', validateRequest(requestPasswordResetSchema), authController.forgotPassword);
router.get('/me', authenticate, authController.me);

export { router as authRouter };
