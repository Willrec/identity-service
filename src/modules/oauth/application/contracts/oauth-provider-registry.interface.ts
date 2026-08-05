import type { IOAuthProvider } from './oauth-provider.interface.js';

export type OAuthProviderType = 'google' | 'github' | 'microsoft' | 'apple';

export interface IOAuthProviderRegistry {
  get(provider: OAuthProviderType): IOAuthProvider;
}
