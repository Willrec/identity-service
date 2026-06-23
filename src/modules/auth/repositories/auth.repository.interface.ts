import type { Prisma } from '@prisma/client';

export interface SessionData {
  id: string;
  userId: string;
  deviceName: string | null;
  browser: string | null;
  operatingSystem: string | null;
  ip: string | null;
  userAgent: string | null;
  lastSeenAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
  deviceName?: string;
  browser?: string;
  operatingSystem?: string;
}

export interface CreateRefreshTokenInput {
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateEmailVerificationTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateAuditLogInput {
  userId?: string;
  action: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface IAuthRepository {
  // Sessions
  createSession(data: CreateSessionInput): Promise<SessionData>;
  findSessionById(id: string): Promise<SessionData | null>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  touchSession(id: string, lastSeenAt: Date): Promise<void>;

  // Refresh tokens
  createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshTokenData>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenData | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllSessionRefreshTokens(sessionId: string): Promise<void>;

  // Email verification
  createEmailVerificationToken(data: CreateEmailVerificationTokenInput): Promise<void>;
  findEmailVerificationToken(tokenHash: string): Promise<{ id: string; userId: string; expiresAt: Date } | null>;
  deleteEmailVerificationToken(id: string): Promise<void>;
  deleteAllUserEmailVerificationTokens(userId: string): Promise<void>;

  // Password reset
  createPasswordResetToken(data: CreatePasswordResetTokenInput): Promise<void>;
  findPasswordResetToken(tokenHash: string): Promise<{ id: string; userId: string; expiresAt: Date } | null>;
  deletePasswordResetToken(id: string): Promise<void>;
  deleteAllUserPasswordResetTokens(userId: string): Promise<void>;

  // Audit log
  createAuditLog(data: CreateAuditLogInput, tx?: Prisma.TransactionClient): Promise<void>;
}
