import type { IOAuthProvider } from '../../../application/contracts/oauth-provider.interface.js';
import type { OAuthTokens } from '../../../application/dto/oauth-tokens.dto.js';
import type { OAuthProfile } from '../../../application/dto/oauth-profile.dto.js';
import { OAuthProviderError } from '../../../application/errors/oauth-provider.error.js';

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
  constructor(
    private readonly config: GoogleOAuthProviderConfig
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
   * Unimplemented placeholder for Phase 16.2.
   */
  exchangeCode(_code: string, _codeVerifier: string): Promise<OAuthTokens> {
    return Promise.reject(new OAuthProviderError('Method not implemented.'));
  }

  /**
   * getProfile
   *
   * Unimplemented placeholder for Phase 16.2.
   */
  getProfile(_accessToken: string): Promise<OAuthProfile> {
    return Promise.reject(new OAuthProviderError('Method not implemented.'));
  }
}
