import type { Request, Response, NextFunction } from 'express';
import type { OAuthService } from '../application/services/oauth.service.js';
import type { IOAuthFlowStore } from '../infrastructure/storage/oauth-flow-store.interface.js';
import type { TokenService } from '../../auth/services/token.service.js';
import type { DeviceInfoDto } from '../../auth/dto/auth.dto.js';
import { OAuthStateError } from '../application/errors/oauth-state.error.js';
import { COOKIES } from '../../../config/constants.js';
import { getRefreshCookieOptions, getCSRFCookieOptions } from '../../../config/cookieOptions.js';
import { env } from '../../../config/env.js';

/**
 * OAuthController
 *
 * HTTP delivery layer controller for federated authentication flows.
 * Handles binding requests/responses, cookie flow storage, and redirects.
 */
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly flowStore: IOAuthFlowStore,
    private readonly tokenService: TokenService
  ) { }

  /**
   * beginGoogleAuth
   *
   * Triggers authorization initiation for Google, stores verifier/state,
   * and issues an HTTP 302 Redirect.
   */
  beginGoogleAuth = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { authorizationUrl, state, codeVerifier } =
        await this.oauthService.beginAuthorization('google');

      await this.flowStore.store(res, { state, codeVerifier });

      res.redirect(authorizationUrl);
    } catch (error) {
      next(error);
    }
  };

  /**
   * callbackGoogle
   *
   * Handles Google's authorization code flow redirect callback.
   * Validates state/cookies, clears the store (one-time consumption),
   * exchanges authorization code, and returns the normalized profile context.
   */
  callbackGoogle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;

      if (!code || !state) {
        throw new OAuthStateError('Missing authorization code or state.');
      }

      // Load temporary flow state from cookie store
      const storedFlow = await this.flowStore.load(req);

      if (!storedFlow) {
        throw new OAuthStateError('Missing OAuth flow session cookie.');
      }

      if (storedFlow.state !== state) {
        throw new OAuthStateError('CSRF state mismatch detected.');
      }

      if (!storedFlow.codeVerifier) {
        throw new OAuthStateError('Missing PKCE code verifier.');
      }

      // One-time consumption: immediately invalidate the store
      await this.flowStore.clear(res);

      const context = await this.oauthService.authenticate(
        'google',
        code,
        storedFlow.codeVerifier
      );

      const authContext = await this.oauthService.resolveIdentity(context);

      const defaultDeviceInfo: DeviceInfoDto = {};
      if (req.ip !== undefined) defaultDeviceInfo.ip = req.ip;
      const ua = req.get('User-Agent');
      if (ua !== undefined) defaultDeviceInfo.userAgent = ua;

      const authResponse = await this.oauthService.authenticateIdentity(authContext, defaultDeviceInfo);

      const refreshToken = authResponse.refreshToken;
      const csrfToken = this.tokenService.generateCsrfToken();

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.cookie(COOKIES.REFRESH, refreshToken, getRefreshCookieOptions());
      res.cookie(COOKIES.CSRF, csrfToken, getCSRFCookieOptions());

      const frontendUrl = env.FRONTEND_URL.endsWith('/') ? env.FRONTEND_URL.slice(0, -1) : env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/auth/oauth/callback`);
    } catch (error) {
      // In compliance with replay protection, ensure store is cleared on failure as well
      try {
        await this.flowStore.clear(res);
      } catch {
        // Suppress nested store clear errors to avoid shadowing original exception
      }
      next(error);
    }
  };
}
