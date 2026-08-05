import type { OAuthProviderType } from '../contracts/oauth-provider-registry.interface.js';
import type { UserStatus } from '../../../../shared/types/domain.types.js';

export type OAuthResolutionResult = 'EXISTING_ACCOUNT' | 'LINKED_ACCOUNT' | 'NEW_ACCOUNT';

/**
 * OAuthIdentityDto
 *
 * Represents the resolved internal Identity Service user payload returned
 * after validating and provisioning/linking an OAuth provider identity.
 */
export interface OAuthIdentityDto {
  readonly userId: string;
  readonly email: string;
  readonly status: UserStatus;
  readonly result: OAuthResolutionResult;
  readonly provider: OAuthProviderType;
}
