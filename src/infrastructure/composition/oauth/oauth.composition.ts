import { OAuthService, CookieOAuthFlowStore } from '../../../modules/oauth/index.js';
import type { IOAuthFlowStore } from '../../../modules/oauth/index.js';
import { GoogleOAuthProvider } from '../../../modules/oauth/infrastructure/providers/google/google-oauth.provider.js';
import { PkceService } from '../../../modules/oauth/infrastructure/services/pkce.service.js';
import { OAuthStateService } from '../../../modules/oauth/infrastructure/services/oauth-state.service.js';
import { env } from '../../../config/env.js';

/**
 * composeOAuthModule
 *
 * Composition root function responsible for assembling OAuth service dependencies.
 * Instantiates concrete cryptographic utilities and the Google OAuth provider,
 * injecting them into the OAuthService application orchestrator.
 */
export function composeOAuthModule(): OAuthService {
  const pkceService = new PkceService();
  const stateService = new OAuthStateService();

  const googleProvider = new GoogleOAuthProvider(
    {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    },
    pkceService,
    stateService
  );

  return new OAuthService(googleProvider);
}

/**
 * composeOAuthFlowStore
 *
 * Instantiates and returns the concrete implementation of the temporary
 * OAuth flow storage (CookieOAuthFlowStore for this phase).
 */
export function composeOAuthFlowStore(): IOAuthFlowStore {
  return new CookieOAuthFlowStore();
}
