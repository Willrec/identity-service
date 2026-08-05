import type { IOAuthProviderRegistry, OAuthProviderType } from '../contracts/oauth-provider-registry.interface.js';
import type { IPkceService } from '../contracts/pkce-service.interface.js';
import type { IOAuthStateService } from '../contracts/oauth-state-service.interface.js';
import type { OAuthAuthorizationDto } from '../dto/oauth-authorization.dto.js';
import type { OAuthAuthenticationContextDto } from '../dto/oauth-authentication-context.dto.js';

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
    private readonly registry: IOAuthProviderRegistry,
    private readonly pkceService: IPkceService,
    private readonly stateService: IOAuthStateService
  ) {}

  /**
   * beginAuthorization
   *
   * Initiates the authorization flow for the requested provider.
   * Generates secure PKCE parameters and CSRF state values, requests the URL
   * from the resolved provider, and returns the authorization payload.
   */
  async beginAuthorization(provider: OAuthProviderType): Promise<OAuthAuthorizationDto> {
    const providerInstance = this.registry.get(provider);

    const state = this.stateService.generateState();
    const codeVerifier = this.pkceService.generateVerifier();
    const codeChallenge = this.pkceService.generateChallenge(codeVerifier);

    const authorizationUrl = await providerInstance.getAuthorizationUrl(state, codeChallenge);

    return {
      authorizationUrl,
      state,
      codeVerifier,
    };
  }

  /**
   * authenticate
   *
   * Coordinates the token exchange and profile retrieval flow with the provider,
   * returning a transport-agnostic authentication context.
   */
  async authenticate(
    provider: OAuthProviderType,
    code: string,
    codeVerifier: string
  ): Promise<OAuthAuthenticationContextDto> {
    const providerInstance = this.registry.get(provider);

    const tokens = await providerInstance.exchangeCode(code, codeVerifier);
    const profile = await providerInstance.getProfile(tokens.accessToken);

    const displayName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ') || undefined;

    return {
      provider: providerInstance.metadata.type,
      providerUserId: profile.providerUserId,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName,
      givenName: profile.firstName,
      familyName: profile.lastName,
      avatarUrl: profile.pictureUrl,
    };
  }
}
