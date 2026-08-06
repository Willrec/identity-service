import type { Request, Response } from 'express';
import { env } from '../../../../config/env.js';
import { encrypt, decrypt } from '../../../../shared/security/crypto.js';
import { getOAuthFlowCookieOptions } from '../../../../config/cookieOptions.js';
import type { IOAuthFlowStore, OAuthFlowState } from './oauth-flow-store.interface.js';

const COOKIE_NAME = '__Host-oauth-session';

/**
 * CookieOAuthFlowStore
 *
 * Concrete implementation of IOAuthFlowStore using HTTP-only, secure cookies.
 * Encapsulates serialization, symmetric AES-256-GCM encryption, validation,
 * and lifecycle management of the temporary state/verifier payload.
 */
export class CookieOAuthFlowStore implements IOAuthFlowStore {
  /**
   * store
   *
   * Serializes, encrypts, and writes the OAuthFlowState into a secure cookie.
   */
  store(res: Response, data: OAuthFlowState): Promise<void> {
    const rawPayload = JSON.stringify(data);
    const encryptedPayload = encrypt(rawPayload, env.OAUTH_COOKIE_SECRET);

    res.cookie(COOKIE_NAME, encryptedPayload, getOAuthFlowCookieOptions());
    return Promise.resolve();
  }

  /**
   * load
   *
   * Reads, decrypts, and parses the secure cookie, returning the OAuthFlowState.
   * Returns null if cookie is missing, tampered, expired, or invalid.
   */
  load(req: Request): Promise<OAuthFlowState | null> {
    const cookies = (req.cookies || {}) as Record<string, string | undefined>;
    const cookieValue = cookies[COOKIE_NAME];

    if (!cookieValue) {
      return Promise.resolve(null);
    }

    try {
      const decrypted = decrypt(cookieValue, env.OAUTH_COOKIE_SECRET);
      const parsed = JSON.parse(decrypted) as OAuthFlowState;

      if (typeof parsed.state === 'string' && typeof parsed.codeVerifier === 'string') {
        return Promise.resolve(parsed);
      }
      return Promise.resolve(null);
    } catch {
      return Promise.resolve(null);
    }
  }

  /**
   * clear
   *
   * Instructs the client browser to immediately clear/invalidate the cookie.
   */
  clear(res: Response): Promise<void> {
    res.clearCookie(COOKIE_NAME, getOAuthFlowCookieOptions());
    return Promise.resolve();
  }
}
