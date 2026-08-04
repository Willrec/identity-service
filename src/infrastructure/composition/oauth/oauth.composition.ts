import { OAuthConfigurationError } from '../../../modules/oauth/index.js';
import type { OAuthService } from '../../../modules/oauth/index.js';

/**
 * composeOAuthModule
 *
 * Composition root function responsible for assembling OAuth service dependencies.
 * Currently configured in a foundational state where no providers are set up.
 */
export function composeOAuthModule(): OAuthService {
  throw new OAuthConfigurationError(
    'OAuth provider has not been configured.'
  );
}
