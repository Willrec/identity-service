export const API_VERSION = 'v1' as const;
export const API_PREFIX = `/api/${API_VERSION}` as const;

export const ACCESS_TOKEN_TTL_S = 15 * 60;           // 15 min
export const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60; // 7 days
export const EMAIL_VERIFY_TOKEN_TTL_S = 24 * 60 * 60; // 24h
export const RESET_TOKEN_TTL_S = 60 * 60;             // 1h
