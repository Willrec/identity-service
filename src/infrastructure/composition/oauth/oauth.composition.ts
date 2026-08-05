import { OAuthService } from '../../../modules/oauth/application/services/oauth.service.js';
import { CookieOAuthFlowStore } from '../../../modules/oauth/infrastructure/storage/cookie-oauth-flow-store.js';
import { OAuthController } from '../../../modules/oauth/controllers/oauth.controller.js';
import { OAuthRepository } from '../../../modules/oauth/repositories/oauth.repository.js';
import type { IOAuthFlowStore } from '../../../modules/oauth/infrastructure/storage/oauth-flow-store.interface.js';
import type {
  IOAuthProviderRegistry,
  OAuthProviderType,
} from '../../../modules/oauth/application/contracts/oauth-provider-registry.interface.js';
import type { IOAuthProvider } from '../../../modules/oauth/application/contracts/oauth-provider.interface.js';
import { GoogleOAuthProvider } from '../../../modules/oauth/infrastructure/providers/google/google-oauth.provider.js';
import { OAuthProviderRegistry } from '../../../modules/oauth/infrastructure/providers/oauth-provider.registry.js';
import { FetchOAuthHttpClient } from '../../../modules/oauth/infrastructure/http/fetch-oauth-http-client.js';
import { PkceService } from '../../../modules/oauth/infrastructure/services/pkce.service.js';
import { OAuthStateService } from '../../../modules/oauth/infrastructure/services/oauth-state.service.js';
import { composeAuthenticationPipelineService } from '../auth/auth.composition.js';
import { TokenService } from '../../../modules/auth/services/token.service.js';
import { AuthRepository } from '../../../modules/auth/repositories/auth.repository.js';
import { prisma } from '../../database/prisma.js';
import { env } from '../../../config/env.js';

/**
 * composeOAuthModule
 *
 * Composition root function responsible for assembling OAuth service dependencies.
 * Instantiates cryptographic helpers, database repository, and registers identity providers
 * in a dynamic registry before injecting them into the OAuthService.
 */
export function composeOAuthModule(): OAuthService {
  const pkceService = new PkceService();
  const stateService = new OAuthStateService();
  const httpClient = new FetchOAuthHttpClient();
  const repository = new OAuthRepository(prisma);
  const authPipelineService = composeAuthenticationPipelineService();

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

  return new OAuthService(
    registry,
    pkceService,
    stateService,
    repository,
    authPipelineService
  );
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
  const authRepo = new AuthRepository(prisma);
  const tokenService = new TokenService(authRepo);

  return new OAuthController(oauthService, oauthFlowStore, tokenService);
}
