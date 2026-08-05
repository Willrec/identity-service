import { Prisma, type PrismaClient } from '@prisma/client';
import type { IOAuthRepository, CreateOAuthAccountInput, CreateOAuthUserInput } from './oauth.repository.interface.js';
import type { OAuthProviderType } from '../application/contracts/oauth-provider-registry.interface.js';
import { OAuthDuplicateEmailError } from '../application/errors/oauth-duplicate-email.error.js';

/**
 * OAuthRepository
 *
 * Concrete Prisma-based implementation of IOAuthRepository.
 * Manages database persistence for OauthAccount and User models.
 */
export class OAuthRepository implements IOAuthRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * findAccount
   *
   * Finds an existing OauthAccount link by provider and providerUserId.
   */
  async findAccount(
    provider: OAuthProviderType,
    providerUserId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; userId: string; provider: string; providerUserId: string } | null> {
    const client = tx ?? this.db;
    return client.oauthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
    });
  }

  /**
   * createAccount
   *
   * Creates a new OauthAccount association linked to a user.
   */
  async createAccount(
    data: CreateOAuthAccountInput,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? this.db;
    await client.oauthAccount.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerUserId: data.providerUserId,
      },
    });
  }

  /**
   * findUserByEmail
   *
   * Looks up a user record by email.
   */
  async findUserByEmail(
    email: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; email: string; emailVerified: boolean; status: string } | null> {
    const client = tx ?? this.db;
    const user = await client.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
    };
  }

  /**
   * createUser
   *
   * Atomically creates a user record. Throws OAuthDuplicateEmailError if email collides.
   */
  async createUser(
    data: CreateOAuthUserInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; email: string }> {
    const client = tx ?? this.db;
    try {
      const user = await client.user.create({
        data: {
          email: data.email.toLowerCase(),
          emailVerified: data.emailVerified,
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          avatarUrl: data.avatarUrl ?? null,
          status: 'ACTIVE',
        },
      });
      return { id: user.id, email: user.email };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new OAuthDuplicateEmailError(data.email);
      }
      throw error;
    }
  }

  /**
   * assignDefaultRole
   *
   * Assigns the default 'USER' role to the specified user.
   */
  async assignDefaultRole(
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? this.db;
    const role = await client.role.findUnique({ where: { name: 'USER' } });
    if (!role) return; // role not seeded yet — skip silently
    await client.userRole.create({ data: { userId, roleId: role.id } });
  }

  /**
   * createAuditLog
   *
   * Records an audit log event.
   */
  async createAuditLog(
    data: { userId: string; action: string; metadata?: Record<string, unknown> },
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? this.db;
    await client.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }
}
