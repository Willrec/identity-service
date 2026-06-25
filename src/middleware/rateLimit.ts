import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/constants.js';

type RateLimitConfig = {
  windowMs: number;
  max: number;
  message: string;
};

const createRateLimiter = (config: RateLimitConfig) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: config.message,
      },
    },
    // store: new RedisStore(...) -> to be injected here when migrating to Redis
  });
};

export const loginRateLimiter = createRateLimiter(RATE_LIMITS.LOGIN);
export const registerRateLimiter = createRateLimiter(RATE_LIMITS.REGISTER);
export const refreshRateLimiter = createRateLimiter(RATE_LIMITS.REFRESH);
export const logoutRateLimiter = createRateLimiter(RATE_LIMITS.LOGOUT);
export const forgotPasswordRateLimiter = createRateLimiter(RATE_LIMITS.FORGOT_PASSWORD);
export const resetPasswordRateLimiter = createRateLimiter(RATE_LIMITS.RESET_PASSWORD);
export const verifyEmailRateLimiter = createRateLimiter(RATE_LIMITS.VERIFY_EMAIL);
export const resendVerificationRateLimiter = createRateLimiter(RATE_LIMITS.RESEND_VERIFICATION);
