import type { IOAuthProvider } from '../../../application/contracts/oauth-provider.interface.js';
import type { OAuthProviderMetadata } from '../../../application/contracts/oauth-provider-registry.interface.js';
import type { IOAuthHttpClient } from '../../../application/contracts/oauth-http-client.interface.js';
import type { OAuthTokens } from '../../../application/dto/oauth-tokens.dto.js';
import type { OAuthProfile } from '../../../application/dto/oauth-profile.dto.js';
import { OAuthProviderErrorMapper } from '../../../application/errors/oauth-provider-error.mapper.js';

export interface GoogleOAuthProviderConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

/**
 * GoogleOAuthProvider
 *
 * Infrastructure implementation of IOAuthProvider for Google Identity Platform.
 * Communicates with Google's OAuth 2.0 Authorization Server.
 * Correctly formats and builds redirections using URL and URLSearchParams.
 */
export class GoogleOAuthProvider implements IOAuthProvider {
  readonly metadata: OAuthProviderMetadata = {
    type: 'google',
    displayName: 'Google',
  };

  constructor(
    private readonly config: GoogleOAuthProviderConfig,
    private readonly httpClient: IOAuthHttpClient
  ) {}

  /**
   * getAuthorizationUrl
   *
   * Assembles Google's authorization code flow endpoint using URLSearchParams,
   * including client credentials, PKCE S256 challenge, state, and scopes.
   */
  getAuthorizationUrl(state: string, codeChallenge: string): Promise<string> {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return Promise.resolve(url.toString());
  }

  /**
   * exchangeCode
   *
   * Exchanges authorization code with Google's token endpoint.
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthTokens> {
    try {
      const data = await this.httpClient.postForm<{
        access_token: string;
        refresh_token?: string;
        id_token?: string;
        expires_in?: number;
        token_type?: string;
      }>('https://oauth2.googleapis.com/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      });

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      };
    } catch (error) {
      throw OAuthProviderErrorMapper.map(this.metadata, error);
    }
  }

  /**
   * getProfile
   *
   * Fetches user profile data from Google's UserInfo API.
   */
  async getProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const data = await this.httpClient.get<{
        sub: string;
        email: string;
        email_verified: boolean;
        given_name?: string;
        family_name?: string;
        picture?: string;
        locale?: string;
      }>('https://www.googleapis.com/oauth2/v3/userinfo', {
        Authorization: `Bearer ${accessToken}`,
      });

      return {
        provider: 'google',
        providerUserId: data.sub,
        email: data.email,
        emailVerified: data.email_verified === true,
        firstName: data.given_name,
        lastName: data.family_name,
        pictureUrl: data.picture,
        locale: data.locale,
      };
    } catch (error) {
      throw OAuthProviderErrorMapper.map(this.metadata, error);
    }
  }
}
