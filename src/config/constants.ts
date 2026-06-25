export const API_VERSION = 'v1' as const;
export const API_PREFIX = `/api/${API_VERSION}` as const;

export const ACCESS_TOKEN_TTL_S = 15 * 60;           // 15 min
export const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60; // 7 days
export const EMAIL_VERIFY_TOKEN_TTL_S = 24 * 60 * 60; // 24h
export const RESET_TOKEN_TTL_S = 60 * 60;             // 1h

export const RATE_LIMITS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try again later.',
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many registration attempts. Please try again later.',
  },
  REFRESH: {
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Too many refresh requests.',
  },
  LOGOUT: {
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Too many logout requests.',
  },
  FORGOT_PASSWORD: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many password reset requests. Please try again later.',
  },
  RESET_PASSWORD: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many password reset attempts. Please try again later.',
  },
  VERIFY_EMAIL: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many verification attempts.',
  },
  RESEND_VERIFICATION: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many resend verification requests. Please try again later.',
  },
} as const;
