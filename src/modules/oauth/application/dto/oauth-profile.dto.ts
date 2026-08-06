/**
 * OAuthProfile
 *
 * Normalized user profile data returned by OAuth provider APIs.
 */
export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string | undefined;
  lastName?: string | undefined;
  pictureUrl?: string | undefined;
  locale?: string | undefined;
}
