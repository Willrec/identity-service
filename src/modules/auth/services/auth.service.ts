import type { IAuthRepository } from '../repositories/auth.repository.interface.js';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma.js';
import type {
  RegisterDto,
  RegisterResponseDto,
  LoginDto,
  LoginResponseDto,
  AuthTokensDto,
  ResetPasswordDto,
} from '../dto/auth.dto.js';
import type { UserResponseDto } from '../../users/dto/user.dto.js';
import type { UserService } from '../../users/services/user.service.js';
import type { TokenService } from './token.service.js';
import { TokenService as JwtTokenService } from '../../../infrastructure/security/jwt.js';
import type { PasswordService } from './password.service.js';
import type { SessionService } from './session.service.js';
import { HttpError } from '../../../shared/errors/HttpError.js';
import { EMAIL_VERIFY_TOKEN_TTL_S, RESET_TOKEN_TTL_S } from '../../../config/constants.js';

import { VerifyEmailTemplate, PasswordResetTemplate, WelcomeTemplate } from '../../email/index.js';
import type { EmailService } from '../../email/index.js';
import { logger } from '../../../shared/logger.js';

export class AuthService {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,

    private readonly emailService: EmailService,
    private readonly jwtTokenService: JwtTokenService = new JwtTokenService(),
  ) { }

  // ──  Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await prisma.$transaction(async (tx) => {
      // createUser checks email uniqueness and throws EMAIL_TAKEN if duplicate
      const user = await this.userService.createUser({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
      }, tx);

      // Assign default USER role (non-fatal if not yet seeded)
      await this.userService.assignRole(user.id, 'USER', tx);

      // Append-only audit trail
      await this.authRepo.createAuditLog({
        userId: user.id,
        action: 'USER_CREATED',
        metadata: { email: user.email },
      }, tx);

      return user;
    });

    if (!user.emailVerified) {
      const token = await this.issueEmailVerificationToken(user.id);
      try {
        await this.emailService.sendTemplateEmail({
          to: user.email,
          template: new VerifyEmailTemplate(user.email, token),
        });
      } catch (error) {
        logger.error({ err: error, userId: user.id }, 'Verification email dispatch failed during registration');
      }
    }

    return { id: user.id, email: user.email, status: user.status };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const record = await this.userService.findByEmailWithPassword(dto.email);
    if (!record) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    if (record.status === 'SUSPENDED') throw HttpError.Forbidden('Account suspended', 'ACCOUNT_SUSPENDED');
    if (record.status === 'DELETED') throw HttpError.Forbidden('Account deleted', 'ACCOUNT_DELETED');
    if (record.status !== 'ACTIVE') throw HttpError.Forbidden('Account inactive', 'ACCOUNT_INACTIVE');
    if (!record.emailVerified) throw HttpError.Forbidden('Email not verified', 'EMAIL_NOT_VERIFIED');
    if (!record.passwordHash) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

    const valid = await this.passwordService.verify(dto.password, record.passwordHash);
    if (!valid) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

    // Create session (restored)
    const session = await this.sessionService.create(record.id, dto.deviceInfo);

    // Issue refresh token
    const refreshToken = await this.tokenService.issueRefreshToken(record.id, session.id);

    await this.authRepo.createAuditLog({
      userId: record.id,
      action: 'LOGIN_SUCCESS',
      metadata: { email: record.email },
    });

    const accessToken = this.jwtTokenService.signAccessToken({
      id: record.id,
      email: record.email,
      status: record.status,
    });

    return {
      user: { id: record.id, email: record.email, status: record.status },
      accessToken,
      refreshToken,
    };
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  async refresh(rawToken: string): Promise<Omit<AuthTokensDto, 'expiresIn'>> {
    const stored = await this.tokenService.findRefreshToken(rawToken);
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw HttpError.Unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const session = await this.sessionService.findById(stored.sessionId);
    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw HttpError.Unauthorized('Session expired', 'SESSION_EXPIRED');
    }

    const user = await this.userService.getById(stored.userId);
    if (user.status !== 'ACTIVE') {
      throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const newRefreshToken = await this.tokenService.rotateRefreshToken(stored.id, user.id, session.id);
    await this.sessionService.touch(session.id);

    const accessToken = this.jwtTokenService.signAccessToken({
      id: user.id,
      email: user.email,
      status: user.status,
    });

    await this.authRepo.createAuditLog({
      userId: user.id,
      action: 'TOKEN_REFRESH',
      metadata: { email: user.email },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string): Promise<void> {
    const stored = await this.tokenService.findRefreshToken(rawRefreshToken);
    if (!stored) return; // idempotent

    await this.authRepo.revokeRefreshToken(stored.id);
    await this.authRepo.revokeAllSessionRefreshTokens(stored.sessionId);
    await this.sessionService.revoke(stored.sessionId);

    await this.authRepo.createAuditLog({
      userId: stored.userId,
      action: 'LOGOUT',
    });
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userService.getRawById(userId);
    if (!user) {
      throw HttpError.NotFound('User not found', 'USER_NOT_FOUND');
    }
    if (user.status === 'DELETED') {
      throw HttpError.Forbidden('User deleted', 'ACCOUNT_DELETED');
    }
    if (user.status === 'SUSPENDED') {
      throw HttpError.Forbidden('User suspended', 'ACCOUNT_SUSPENDED');
    }
    return user;
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAll(userId);
  }

  // ── Email verification ─────────────────────────────────────────────────────

  async issueEmailVerificationToken(userId: string, tx?: Prisma.TransactionClient): Promise<string> {
    await this.authRepo.deleteAllUserEmailVerificationTokens(userId, tx);
    const token = this.tokenService.generateOpaqueToken();
    await this.authRepo.createEmailVerificationToken({
      userId,
      tokenHash: this.tokenService.hashToken(token),
      expiresAt: this.tokenService.fromNowSeconds(EMAIL_VERIFY_TOKEN_TTL_S),
    }, tx);
    return token;
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const hashed = this.tokenService.hashToken(rawToken);
    let userEmail: string | undefined;
    let userId: string | undefined;

    await prisma.$transaction(async (tx) => {
      const record = await this.authRepo.findEmailVerificationToken(hashed, tx);
      if (!record || record.expiresAt < new Date()) {
        throw HttpError.BadRequest('Invalid or expired token', 'INVALID_VERIFICATION_TOKEN');
      }

      const user = await this.userService.getRawById(record.userId, tx);
      if (!user) {
        throw HttpError.BadRequest('User not found', 'INVALID_VERIFICATION_TOKEN');
      }
      if (user.emailVerified) {
        throw HttpError.Conflict('Email already verified', 'EMAIL_ALREADY_VERIFIED');
      }

      await this.userService.markEmailVerified(record.userId, tx);
      await this.authRepo.deleteEmailVerificationToken(record.id, tx);

      await this.authRepo.createAuditLog({
        userId: record.userId,
        action: 'EMAIL_VERIFIED',
      }, tx);

      userEmail = user.email;
      userId = user.id;
    });

    if (userEmail && userId) {
      try {
        await this.emailService.sendTemplateEmail({
          to: userEmail,
          template: new WelcomeTemplate(userEmail),
        });
      } catch (error) {
        logger.error({ err: error, userId }, 'Welcome email dispatch failed');
      }
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userService.getByEmail(email);
    // Silent return to prevent user enumeration:
    if (!user || user.status !== 'ACTIVE' || user.emailVerified) {
      return;
    }

    // 1. Transaction Boundary: Atomically invalidate old tokens and create the new one
    const token = await prisma.$transaction(async (tx) => {
      return this.issueEmailVerificationToken(user.id, tx);
    });

    // 2. Email Dispatch: Execute outside the transaction boundary
    try {
      await this.emailService.sendTemplateEmail({
        to: user.email,
        template: new VerifyEmailTemplate(user.email, token),
      });
    } catch (error) {
      logger.error({ err: error, userId: user.id }, 'Verification email dispatch failed during resend');
    }
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.getByEmail(email);
    // Silent return to prevent user enumeration:
    if (!user || user.status !== 'ACTIVE' || !user.emailVerified) {
      return;
    }

    // 1. Transaction Boundary: Atomically invalidate old tokens, create new token, write audit log
    const token = await prisma.$transaction(async (tx) => {
      const token = await this.issuePasswordResetToken(user.id, tx);

      await this.authRepo.createAuditLog({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
      }, tx);

      return token;
    });

    // 2. Email Dispatch: Execute outside the transaction boundary
    try {
      await this.emailService.sendTemplateEmail({
        to: user.email,
        template: new PasswordResetTemplate(user.email, token),
      });
    } catch (error) {
      logger.error({ err: error, userId: user.id }, 'Password reset email dispatch failed');
    }
  }

  async issuePasswordResetToken(userId: string, tx?: Prisma.TransactionClient): Promise<string> {
    await this.authRepo.deleteAllUserPasswordResetTokens(userId, tx);
    const token = this.tokenService.generateOpaqueToken();
    await this.authRepo.createPasswordResetToken({
      userId,
      tokenHash: this.tokenService.hashToken(token),
      expiresAt: this.tokenService.fromNowSeconds(RESET_TOKEN_TTL_S),
    }, tx);
    return token;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // 1. CPU-bound hashing occurs outside the database transaction
    const passwordHash = await this.passwordService.hash(dto.newPassword);
    const hashedToken = this.tokenService.hashToken(dto.token);

    // 2. Database transaction boundary
    await prisma.$transaction(async (tx) => {
      // Validate token state
      const record = await this.authRepo.findPasswordResetToken(hashedToken, tx);
      if (!record || record.expiresAt < new Date()) {
        throw HttpError.BadRequest('Invalid or expired token', 'INVALID_RESET_TOKEN');
      }

      // Validate user eligibility (silent error to prevent enumeration)
      const user = await this.userService.getRawById(record.userId, tx);
      if (!user || user.status !== 'ACTIVE') {
        throw HttpError.BadRequest('Invalid or expired token', 'INVALID_RESET_TOKEN');
      }

      // Update password hash
      await this.userService.updatePassword(record.userId, passwordHash, tx);

      // Invalidate/delete the password reset token
      await this.authRepo.deletePasswordResetToken(record.id, tx);

      // Invalidate all user sessions and refresh tokens
      await this.sessionService.revokeAll(record.userId, tx);
      await this.authRepo.revokeAllUserRefreshTokens(record.userId, tx);

      // Record audit log
      await this.authRepo.createAuditLog({
        userId: record.userId,
        action: 'PASSWORD_RESET_COMPLETED',
      }, tx);
    });
  }
}
