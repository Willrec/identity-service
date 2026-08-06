import type { OAuthProviderMetadata } from '../contracts/oauth-provider-registry.interface.js';
import { OAuthProviderError } from './oauth-provider.error.js';
import { OAuthHttpError } from './oauth-http.error.js';

/**
 * OAuthProviderErrorMapper
 *
 * Normalizes external HTTP, API, or SDK failures from OAuth identity providers
 * into a single unified application exception (OAuthProviderError).
 */
export class OAuthProviderErrorMapper {
  /**
   * map
   *
   * Maps provider-specific connection or response errors into an OAuthProviderError
   * enriched with the provider's metadata.
   */
  static map(provider: OAuthProviderMetadata, error: unknown): OAuthProviderError {
    if (error instanceof OAuthProviderError) {
      return error;
    }

    if (error instanceof OAuthHttpError) {
      return new OAuthProviderError(
        `OAuth provider "${provider.displayName}" failed: ${error.statusText} (${error.status}) - ${error.body}`
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new OAuthProviderError(
      `OAuth provider "${provider.displayName}" failed: ${message}`
    );
  }
}
