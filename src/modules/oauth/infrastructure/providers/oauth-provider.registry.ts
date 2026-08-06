import type { IOAuthProvider } from '../../application/contracts/oauth-provider.interface.js';
import type { IOAuthProviderRegistry, OAuthProviderType } from '../../application/contracts/oauth-provider-registry.interface.js';
import { OAuthConfigurationError } from '../../application/errors/oauth-configuration.error.js';

/**
 * OAuthProviderRegistry
 *
 * Infrastructure implementation of IOAuthProviderRegistry.
 * Maintains a map of concrete IOAuthProvider instances and dynamically resolves
 * them based on provider identifier types.
 */
export class OAuthProviderRegistry implements IOAuthProviderRegistry {
  constructor(
    private readonly providers: Map<OAuthProviderType, IOAuthProvider>
  ) {}

  /**
   * get
   *
   * Resolves a registered IOAuthProvider.
   * Throws an OAuthConfigurationError if the requested provider is not configured.
   */
  get(provider: OAuthProviderType): IOAuthProvider {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new OAuthConfigurationError(
        `OAuth provider "${provider}" has not been configured.`
      );
    }
    return providerInstance;
  }
}
