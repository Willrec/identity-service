import type { IAuthRepository } from '../repositories/auth.repository.interface.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
import type {
  RegisterDto,
  RegisterResponseDto,
  LoginDto,
  LoginResponseDto,
  AuthResponseDto,
  AuthTokensDto,
  DeviceInfoDto,
} from '../dto/auth.dto.js';
import type { UserService } from '../../users/services/user.service.js';
import type { TokenService } from './token.service.js';
import { TokenService as JwtTokenService } from '../../../infrastructure/security/jwt.js';
import type { PasswordService } from './password.service.js';
import type { SessionService } from './session.service.js';
import { HttpError } from '../../../shared/errors/HttpError.js';
import { EMAIL_VERIFY_TOKEN_TTL_S, RESET_TOKEN_TTL_S } from '../../../config/constants.js';

export class AuthService {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly jwtTokenService: JwtTokenService = new JwtTokenService(),
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);

    return prisma.$transaction(async (tx) => {
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

      return { id: user.id, email: user.email, status: user.status };
    });
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const record = await this.userService.findByEmailWithPassword(dto.email);
    if (!record) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    if (record.status !== 'ACTIVE') throw HttpError.Forbidden('Account suspended', 'ACCOUNT_SUSPENDED');
    if (!record.passwordHash) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

    const valid = await this.passwordService.verify(dto.password, record.passwordHash);
    if (!valid) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

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
    };
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  async refresh(rawToken: string): Promise<AuthTokensDto> {
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

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, email: user.email });
    return this.tokenService.buildTokensResponse(accessToken, newRefreshToken);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string): Promise<void> {
    const stored = await this.tokenService.findRefreshToken(rawRefreshToken);
    if (!stored) return; // idempotent

    await this.authRepo.revokeRefreshToken(stored.id);
    await this.sessionService.revoke(stored.sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAll(userId);
  }

  // ── Email verification ─────────────────────────────────────────────────────

  async issueEmailVerificationToken(userId: string): Promise<string> {
    await this.authRepo.deleteAllUserEmailVerificationTokens(userId);
    const token = this.tokenService.generateOpaqueToken();
    await this.authRepo.createEmailVerificationToken({
      userId,
      tokenHash: this.tokenService.hashToken(token),
      expiresAt: this.tokenService.fromNowSeconds(EMAIL_VERIFY_TOKEN_TTL_S),
    });
    return token;
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const record = await this.authRepo.findEmailVerificationToken(
      this.tokenService.hashToken(rawToken),
    );
    if (!record || record.expiresAt < new Date()) {
      throw HttpError.BadRequest('Invalid or expired token', 'INVALID_VERIFICATION_TOKEN');
    }
    await this.userService.markEmailVerified(record.userId);
    await this.authRepo.deleteEmailVerificationToken(record.id);
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  async issuePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.userService.getByEmail(email);
    if (!user || user.status !== 'ACTIVE') return null; // silent — don't leak existence

    await this.authRepo.deleteAllUserPasswordResetTokens(user.id);
    const token = this.tokenService.generateOpaqueToken();
    await this.authRepo.createPasswordResetToken({
      userId: user.id,
      tokenHash: this.tokenService.hashToken(token),
      expiresAt: this.tokenService.fromNowSeconds(RESET_TOKEN_TTL_S),
    });
    return token;
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.authRepo.findPasswordResetToken(
      this.tokenService.hashToken(rawToken),
    );
    if (!record || record.expiresAt < new Date()) {
      throw HttpError.BadRequest('Invalid or expired token', 'INVALID_RESET_TOKEN');
    }
    const passwordHash = await this.passwordService.hash(newPassword);
    void passwordHash; // TODO: add updatePassword(id, hash) to IUserRepository

    await this.authRepo.deleteAllUserPasswordResetTokens(record.userId);
    await this.sessionService.revokeAll(record.userId);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async issueTokenPair(
    userId: string,
    email: string,
    deviceInfo?: DeviceInfoDto,
  ): Promise<AuthTokensDto> {
    const session = await this.sessionService.create(userId, deviceInfo);
    const accessToken = this.tokenService.signAccessToken({ sub: userId, email });
    const refreshToken = await this.tokenService.issueRefreshToken(userId, session.id);
    return this.tokenService.buildTokensResponse(accessToken, refreshToken);
  }
}
