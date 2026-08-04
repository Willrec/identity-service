import type { OAuthProfile } from '../dto/oauth-profile.dto.js';
import type { OAuthTokens } from '../dto/oauth-tokens.dto.js';

export interface IOAuthProvider {
  getAuthorizationUrl(): Promise<string>;

  exchangeCode(
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokens>;

  getProfile(
    accessToken: string
  ): Promise<OAuthProfile>;
}
