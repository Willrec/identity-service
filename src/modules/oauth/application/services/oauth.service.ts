import type { IOAuthProvider } from '../contracts/oauth-provider.interface.js';

/**
 * OAuthService
 *
 * Application orchestrator for federated identity authentication.
 * Acts as a decoupled interface between web controller routers and individual
 * external OAuth2/OIDC identity providers.
 *
 * In compliance with architectural boundaries, this service contains no database
 * persistence, JWT generation, Express middleware handling, or external SDK/HTTP clients.
 */
export class OAuthService {
  constructor(
    private readonly provider: IOAuthProvider
  ) {}

  /**
   * getAuthorizationUrl
   *
   * Retrieves the secure redirection authorization URL from the configured provider.
   */
  async getAuthorizationUrl(): Promise<string> {
    return this.provider.getAuthorizationUrl();
  }
}
