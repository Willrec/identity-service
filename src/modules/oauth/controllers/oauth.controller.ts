import type { Request, Response, NextFunction } from 'express';
import type { OAuthService } from '../application/services/oauth.service.js';
import type { IOAuthFlowStore } from '../infrastructure/storage/oauth-flow-store.interface.js';

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
}
