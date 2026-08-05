/**
 * OAuthTokens
 *
 * Represents raw tokens returned from an OAuth provider's Token Endpoint.
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string | undefined;
  idToken?: string | undefined;
  expiresIn?: number | undefined;
  tokenType?: string | undefined;
}
