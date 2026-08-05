import type { IOAuthProviderRegistry, OAuthProviderType } from '../contracts/oauth-provider-registry.interface.js';
import type { IPkceService } from '../contracts/pkce-service.interface.js';
import type { IOAuthStateService } from '../contracts/oauth-state-service.interface.js';
import type { OAuthAuthorizationDto } from '../dto/oauth-authorization.dto.js';
import type { OAuthAuthenticationContextDto } from '../dto/oauth-authentication-context.dto.js';
import type { IOAuthRepository } from '../../repositories/oauth.repository.interface.js';
import type { OAuthIdentityDto } from '../dto/oauth-identity.dto.js';
import { OAuthDuplicateEmailError } from '../errors/oauth-duplicate-email.error.js';
import { prisma } from '../../../../infrastructure/database/prisma.js';
import { HttpError } from '../../../../shared/errors/HttpError.js';
import type { Prisma } from '@prisma/client';
import type { AuthenticationPipelineService } from '../../../auth/services/authentication-pipeline.service.js';
import { AuthenticationEvent } from '../../../auth/dto/auth.dto.js';
import type { DeviceInfoDto, LoginResponseDto } from '../../../auth/dto/auth.dto.js';
import type { UserStatus } from '../../../../shared/types/domain.types.js';

/**
 * OAuthService
 *
 * Application orchestrator for federated identity authentication.
 * Acts as a decoupled interface between web controller routers and individual
 * external OAuth2/OIDC identity providers.
 *
 * In compliance with architectural boundaries, this service contains no database
 * persistence, JWT generation, Express middleware handling, or external SDK/HTTP clients.
 */
export class OAuthService {
  constructor(
    private readonly registry: IOAuthProviderRegistry,
    private readonly pkceService: IPkceService,
    private readonly stateService: IOAuthStateService,
    private readonly repository: IOAuthRepository,
    private readonly authPipelineService: AuthenticationPipelineService
  ) {}

  /**
   * beginAuthorization
   *
   * Initiates the authorization flow for the requested provider.
   * Generates secure PKCE parameters and CSRF state values, requests the URL
   * from the resolved provider, and returns the authorization payload.
   */
  async beginAuthorization(provider: OAuthProviderType): Promise<OAuthAuthorizationDto> {
    const providerInstance = this.registry.get(provider);

    const state = this.stateService.generateState();
    const codeVerifier = this.pkceService.generateVerifier();
    const codeChallenge = this.pkceService.generateChallenge(codeVerifier);

    const authorizationUrl = await providerInstance.getAuthorizationUrl(state, codeChallenge);

    return {
      authorizationUrl,
      state,
      codeVerifier,
    };
  }

  /**
   * authenticate
   *
   * Coordinates the token exchange and profile retrieval flow with the provider,
   * returning a transport-agnostic authentication context.
   */
  async authenticate(
    provider: OAuthProviderType,
    code: string,
    codeVerifier: string
  ): Promise<OAuthAuthenticationContextDto> {
    const providerInstance = this.registry.get(provider);

    const tokens = await providerInstance.exchangeCode(code, codeVerifier);
    const profile = await providerInstance.getProfile(tokens.accessToken);

    const displayName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ') || undefined;

    return {
      provider: providerInstance.metadata.type,
      providerUserId: profile.providerUserId,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName,
      givenName: profile.firstName,
      familyName: profile.lastName,
      avatarUrl: profile.pictureUrl,
    };
  }

  /**
   * resolveIdentity
   *
   * Resolves the authenticated provider profile into an internal User identity.
   * Maps existing accounts, auto-links verified email collisions (preventing takeover),
   * and provisions new identities atomically with default role and audit trail.
   *
   * Handles concurrency race conditions by catching DuplicateEmailError at domain level
   * and switching to linking workflow in-flight.
   */
  async resolveIdentity(
    context: OAuthAuthenticationContextDto
  ): Promise<OAuthIdentityDto> {
    const provider = context.provider;
    const providerUserId = context.providerUserId;

    // 1. Check for existing OAuth account link
    const existingAccount = await this.repository.findAccount(provider, providerUserId);

    if (existingAccount) {
      // Find associated user
      const user = await this.repository.findUserByEmail(context.email);
      if (!user) {
        throw HttpError.NotFound('User associated with OAuth account not found.', 'USER_NOT_FOUND');
      }

      if (user.status === 'SUSPENDED') {
        throw HttpError.Forbidden('Account suspended.', 'ACCOUNT_SUSPENDED');
      }
      if (user.status === 'DELETED') {
        throw HttpError.Forbidden('Account deleted.', 'ACCOUNT_DELETED');
      }

      return {
        userId: user.id,
        email: user.email,
        status: user.status as UserStatus,
        result: 'EXISTING_ACCOUNT',
        provider,
      };
    }

    // 2. Account link not found: look up user by email to link
    const existingUser = await this.repository.findUserByEmail(context.email);

    if (existingUser) {
      // Anti-takeover check: both the provider and the local email MUST be verified
      if (!context.emailVerified || !existingUser.emailVerified) {
        throw HttpError.Forbidden('Cannot link account: email is unverified.', 'EMAIL_UNVERIFIED');
      }

      if (existingUser.status === 'SUSPENDED') {
        throw HttpError.Forbidden('Account suspended.', 'ACCOUNT_SUSPENDED');
      }
      if (existingUser.status === 'DELETED') {
        throw HttpError.Forbidden('Account deleted.', 'ACCOUNT_DELETED');
      }

      // Link OAuth account to the existing verified user (no profile update occurs)
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await this.repository.createAccount(
          {
            userId: existingUser.id,
            provider,
            providerUserId,
          },
          tx
        );

        await this.repository.createAuditLog(
          {
            userId: existingUser.id,
            action: 'OAUTH_ACCOUNT_LINKED',
            metadata: { provider, email: existingUser.email },
          },
          tx
        );
      });

      return {
        userId: existingUser.id,
        email: existingUser.email,
        status: existingUser.status as UserStatus,
        result: 'LINKED_ACCOUNT',
        provider,
      };
    }

    // 3. Brand new user provisioning (with concurrency race condition fallback)
    try {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const newUser = await this.repository.createUser(
          {
            email: context.email,
            emailVerified: context.emailVerified,
            firstName: context.givenName,
            lastName: context.familyName,
            avatarUrl: context.avatarUrl,
          },
          tx
        );

        await this.repository.createAccount(
          {
            userId: newUser.id,
            provider,
            providerUserId,
          },
          tx
        );

        await this.repository.assignDefaultRole(newUser.id, tx);

        await this.repository.createAuditLog(
          {
            userId: newUser.id,
            action: 'OAUTH_ACCOUNT_CREATED',
            metadata: { provider, email: newUser.email },
          },
          tx
        );

        return newUser;
      });

      return {
        userId: result.id,
        email: result.email,
        status: 'ACTIVE',
        result: 'NEW_ACCOUNT',
        provider,
      };
    } catch (error) {
      if (error instanceof OAuthDuplicateEmailError) {
        // Race condition: another concurrent process created the user. Fallback to linking.
        const user = await this.repository.findUserByEmail(context.email);
        if (!user) {
          throw error; // Re-throw if user is still missing
        }

        if (!context.emailVerified || !user.emailVerified) {
          throw HttpError.Forbidden('Cannot link account: email is unverified.', 'EMAIL_UNVERIFIED');
        }

        if (user.status === 'SUSPENDED') {
          throw HttpError.Forbidden('Account suspended.', 'ACCOUNT_SUSPENDED');
        }
        if (user.status === 'DELETED') {
          throw HttpError.Forbidden('Account deleted.', 'ACCOUNT_DELETED');
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await this.repository.createAccount(
            {
              userId: user.id,
              provider,
              providerUserId,
            },
            tx
          );

          await this.repository.createAuditLog(
            {
              userId: user.id,
              action: 'OAUTH_ACCOUNT_LINKED',
              metadata: { provider, email: user.email },
            },
            tx
          );
        });

        return {
          userId: user.id,
          email: user.email,
          status: user.status as UserStatus,
          result: 'LINKED_ACCOUNT',
          provider,
        };
      }
      throw error;
    }
  }

  /**
   * authenticateIdentity
   *
   * Coordinates the post-resolution session creation and token issuance.
   * Consumes only the normalized identity object, keeping the process provider-agnostic.
   */
  async authenticateIdentity(
    identity: OAuthIdentityDto,
    deviceInfo?: DeviceInfoDto
  ): Promise<LoginResponseDto> {
    if (identity.status === 'SUSPENDED') {
      throw HttpError.Forbidden('Account suspended.', 'ACCOUNT_SUSPENDED');
    }
    if (identity.status === 'DELETED') {
      throw HttpError.Forbidden('Account deleted.', 'ACCOUNT_DELETED');
    }

    return this.authPipelineService.authenticateUser(
      identity.userId,
      identity.email,
      identity.status,
      AuthenticationEvent.OAUTH_LOGIN_SUCCESS,
      deviceInfo
    );
  }
}
