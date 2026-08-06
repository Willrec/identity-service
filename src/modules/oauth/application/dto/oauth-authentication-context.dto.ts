import type { OAuthProviderType } from '../contracts/oauth-provider-registry.interface.js';

/**
 * OAuthAuthenticationContextDto
 *
 * Represents the normalized user data returned from an identity provider
 * after a successful authentication and token exchange flow.
 */
export interface OAuthAuthenticationContextDto {
  readonly provider: OAuthProviderType;
  readonly providerUserId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly displayName?: string | undefined;
  readonly givenName?: string | undefined;
  readonly familyName?: string | undefined;
  readonly avatarUrl?: string | undefined;
}
