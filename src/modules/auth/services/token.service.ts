import crypto from 'node:crypto';
import type { IAuthRepository, RefreshTokenData } from '../repositories/auth.repository.interface.js';
import type { AuthTokensDto } from '../dto/auth.dto.js';
import { ACCESS_TOKEN_TTL_S, REFRESH_TOKEN_TTL_S } from '../../../config/constants.js';

export class TokenService {
  constructor(private readonly authRepo: IAuthRepository) {}

  // ── Crypto helpers ─────────────────────────────────────────────────────────

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateOpaqueToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  fromNowSeconds(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }

  // ── Refresh tokens ─────────────────────────────────────────────────────────

  async issueRefreshToken(userId: string, sessionId: string): Promise<string> {
    const raw = this.generateOpaqueToken();
    await this.authRepo.createRefreshToken({
      userId,
      sessionId,
      tokenHash: this.hashToken(raw),
      expiresAt: this.fromNowSeconds(REFRESH_TOKEN_TTL_S),
    });
    return raw;
  }

  async findRefreshToken(rawToken: string): Promise<RefreshTokenData | null> {
    return this.authRepo.findRefreshTokenByHash(this.hashToken(rawToken));
  }

  async rotateRefreshToken(oldTokenId: string, userId: string, sessionId: string): Promise<string> {
    await this.authRepo.revokeRefreshToken(oldTokenId);
    return this.issueRefreshToken(userId, sessionId);
  }

  // ── Response builder ───────────────────────────────────────────────────────

  buildTokensResponse(accessToken: string, refreshToken: string): AuthTokensDto {
    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_S };
  }
}
