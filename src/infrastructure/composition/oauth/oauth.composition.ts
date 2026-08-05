import {
  OAuthService,
  CookieOAuthFlowStore,
  OAuthController,
} from '../../../modules/oauth/index.js';
import type {
  IOAuthFlowStore,
  IOAuthProviderRegistry,
  OAuthProviderType,
  IOAuthProvider,
} from '../../../modules/oauth/index.js';
import { GoogleOAuthProvider } from '../../../modules/oauth/infrastructure/providers/google/google-oauth.provider.js';
import { OAuthProviderRegistry } from '../../../modules/oauth/infrastructure/providers/oauth-provider.registry.js';
import { FetchOAuthHttpClient } from '../../../modules/oauth/infrastructure/http/fetch-oauth-http-client.js';
import { PkceService } from '../../../modules/oauth/infrastructure/services/pkce.service.js';
import { OAuthStateService } from '../../../modules/oauth/infrastructure/services/oauth-state.service.js';
import { env } from '../../../config/env.js';

/**
 * composeOAuthModule
 *
 * Composition root function responsible for assembling OAuth service dependencies.
 * Instantiates cryptographic helpers and registers identity providers in a dynamic registry
 * before injecting them into the OAuthService.
 */
export function composeOAuthModule(): OAuthService {
  const pkceService = new PkceService();
  const stateService = new OAuthStateService();
  const httpClient = new FetchOAuthHttpClient();

  const googleProvider = new GoogleOAuthProvider(
    {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    },
    httpClient
  );

  const providers = new Map<OAuthProviderType, IOAuthProvider>([
    ['google', googleProvider],
  ]);

  const registry: IOAuthProviderRegistry = new OAuthProviderRegistry(providers);

  return new OAuthService(registry, pkceService, stateService);
}

/**
 * composeOAuthFlowStore
 *
 * Instantiates and returns the concrete implementation of the temporary
 * OAuth flow storage (CookieOAuthFlowStore).
 */
export function composeOAuthFlowStore(): IOAuthFlowStore {
  return new CookieOAuthFlowStore();
}

/**
 * composeOAuthController
 *
 * Assembles and returns the fully configured OAuthController.
 */
export function composeOAuthController(): OAuthController {
  const oauthService = composeOAuthModule();
  const oauthFlowStore = composeOAuthFlowStore();

  return new OAuthController(oauthService, oauthFlowStore);
}
