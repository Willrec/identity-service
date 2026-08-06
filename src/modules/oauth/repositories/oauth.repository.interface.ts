import type { Prisma } from '@prisma/client';
import type { OAuthProviderType } from '../application/contracts/oauth-provider-registry.interface.js';

export interface CreateOAuthAccountInput {
  readonly userId: string;
  readonly provider: OAuthProviderType;
  readonly providerUserId: string;
}

export interface CreateOAuthUserInput {
  readonly email: string;
  readonly emailVerified: boolean;
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly avatarUrl?: string | undefined;
}

/**
 * IOAuthRepository
 *
 * Repository abstraction responsible for user profiles and OAuth accounts persistence.
 * Exposes pure transactional mappings decoupled from Express or provider details.
 */
export interface IOAuthRepository {
  /**
   * findAccount
   *
   * Finds an existing OauthAccount link by provider and providerUserId.
   */
  findAccount(
    provider: OAuthProviderType,
    providerUserId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; userId: string; provider: string; providerUserId: string } | null>;

  /**
   * createAccount
   *
   * Creates a new OauthAccount association linked to a user.
   */
  createAccount(
    data: CreateOAuthAccountInput,
    tx?: Prisma.TransactionClient
  ): Promise<void>;

  /**
   * findUserByEmail
   *
   * Looks up a user record by email.
   */
  findUserByEmail(
    email: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; email: string; emailVerified: boolean; status: string } | null>;

  /**
   * createUser
   *
   * Atomically creates a user record. Throws OAuthDuplicateEmailError if email collides.
   */
  createUser(
    data: CreateOAuthUserInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; email: string }>;

  /**
   * assignDefaultRole
   *
   * Assigns the default 'USER' role to the specified user.
   */
  assignDefaultRole(
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void>;

  /**
   * createAuditLog
   *
   * Records an audit log event.
   */
  createAuditLog(
    data: { userId: string; action: string; metadata?: Record<string, unknown> },
    tx?: Prisma.TransactionClient
  ): Promise<void>;
}
