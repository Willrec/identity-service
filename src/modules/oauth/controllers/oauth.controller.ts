import type { Request, Response, NextFunction } from 'express';
import type { OAuthService } from '../application/services/oauth.service.js';
import type { IOAuthFlowStore } from '../infrastructure/storage/oauth-flow-store.interface.js';
import { OAuthStateError } from '../application/errors/oauth-state.error.js';

/**
 * OAuthController
 *
 * HTTP delivery layer controller for federated authentication flows.
 * Handles binding requests/responses, cookie flow storage, and redirects.
 */
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly flowStore: IOAuthFlowStore
  ) {}

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

      // Temporary return mechanism for Phase 16.5 verification
      // Can be replaced by next authentication stage in future phases
      res.status(200).json({
        success: true,
        data: context,
      });
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
