import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  IAuthRepository,
  SessionData,
  RefreshTokenData,
  CreateSessionInput,
  CreateRefreshTokenInput,
  CreateEmailVerificationTokenInput,
  CreatePasswordResetTokenInput,
  CreateAuditLogInput,
} from './auth.repository.interface.js';

export class AuthRepository implements IAuthRepository {
  constructor(private readonly db: PrismaClient) {}

  // ── Sessions ───────────────────────────────────────────────────────────────

  async createSession(data: CreateSessionInput): Promise<SessionData> {
    return this.db.session.create({
      data: {
        userId: data.userId,
        expiresAt: data.expiresAt,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        deviceName: data.deviceName ?? null,
        browser: data.browser ?? null,
        operatingSystem: data.operatingSystem ?? null,
      },
    });
  }

  async findSessionById(id: string): Promise<SessionData | null> {
    return this.db.session.findUnique({ where: { id } });
  }

  async revokeSession(id: string): Promise<void> {
    await this.db.session.update({
      where: { id },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db.session.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  async touchSession(id: string, lastSeenAt: Date): Promise<void> {
    await this.db.session.update({ where: { id }, data: { lastSeenAt } });
  }

  // ── Refresh tokens ─────────────────────────────────────────────────────────

  async createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshTokenData> {
    return this.db.refreshToken.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenData | null> {
    return this.db.refreshToken.findFirst({ where: { tokenHash } });
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.db.refreshToken.update({
      where: { id },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllSessionRefreshTokens(sessionId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { sessionId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  // ── Email verification ─────────────────────────────────────────────────────

  async createEmailVerificationToken(
    data: CreateEmailVerificationTokenInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.db;
    await client.emailVerificationToken.create({
      data: { userId: data.userId, tokenHash: data.tokenHash, expiresAt: data.expiresAt },
    });
  }

  async findEmailVerificationToken(
    tokenHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; userId: string; expiresAt: Date } | null> {
    const client = tx ?? this.db;
    return client.emailVerificationToken.findFirst({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
  }

  async deleteEmailVerificationToken(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.db;
    await client.emailVerificationToken.delete({ where: { id } });
  }

  async deleteAllUserEmailVerificationTokens(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.db;
    await client.emailVerificationToken.deleteMany({ where: { userId } });
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  async createPasswordResetToken(data: CreatePasswordResetTokenInput): Promise<void> {
    await this.db.passwordResetToken.create({
      data: { userId: data.userId, tokenHash: data.tokenHash, expiresAt: data.expiresAt },
    });
  }

  async findPasswordResetToken(
    tokenHash: string,
  ): Promise<{ id: string; userId: string; expiresAt: Date } | null> {
    return this.db.passwordResetToken.findFirst({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await this.db.passwordResetToken.delete({ where: { id } });
  }

  async deleteAllUserPasswordResetTokens(userId: string): Promise<void> {
    await this.db.passwordResetToken.deleteMany({ where: { userId } });
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async createAuditLog(data: CreateAuditLogInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.db;
    await client.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }
}
