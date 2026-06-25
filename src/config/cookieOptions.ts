import type { CookieOptions } from 'express';
import { env } from './env.js';
import { REFRESH_TOKEN_TTL_S } from './constants.js';

export const getRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: REFRESH_TOKEN_TTL_S * 1000,
  priority: 'high',
});

export const getCSRFCookieOptions = (): CookieOptions => ({
  httpOnly: false,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: REFRESH_TOKEN_TTL_S * 1000,
  priority: 'high',
});
