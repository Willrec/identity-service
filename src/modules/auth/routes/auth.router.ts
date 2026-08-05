import { Router, type IRouter } from 'express';
import { validateRequest } from '../../../middleware/validate.js';
import { registerSchema, loginSchema, verifyEmailSchema, resendVerificationEmailSchema, requestPasswordResetSchema, resetPasswordSchema } from '../validators/auth.validator.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { csrfProtection } from '../../../middleware/csrfProtection.js';
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
import { composeAuthController } from '../../../infrastructure/composition/auth/auth.composition.js';

const authController = composeAuthController();

const router: IRouter = Router();

// Routes
router.post('/register', registerRateLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', loginRateLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', refreshRateLimiter, csrfProtection, authController.refresh);
router.post('/logout', logoutRateLimiter, csrfProtection, authController.logout);
router.post('/verify-email', verifyEmailRateLimiter, validateRequest(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', resendVerificationRateLimiter, validateRequest(resendVerificationEmailSchema), authController.resendVerification);
router.post('/forgot-password', forgotPasswordRateLimiter, validateRequest(requestPasswordResetSchema), authController.forgotPassword);
router.post('/reset-password', resetPasswordRateLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.me);

export { router as authRouter };
