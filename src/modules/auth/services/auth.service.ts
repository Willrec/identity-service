import type { IAuthRepository } from '../repositories/auth.repository.interface.js';
import type { IUserRepository } from '../../users/repositories/user.repository.interface.js';
import type {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  AuthTokensDto,
  DeviceInfoDto,
} from '../dto/auth.dto.js';
import type { TokenService } from './token.service.js';
import type { PasswordService } from './password.service.js';
import type { SessionService } from './session.service.js';
import { HttpError } from '../../../shared/errors/HttpError.js';
import { EMAIL_VERIFY_TOKEN_TTL_S, RESET_TOKEN_TTL_S } from '../../../config/constants.js';

export class AuthService {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw HttpError.BadRequest('Email already registered', 'EMAIL_TAKEN');

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.userRepo.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
    });

    // Placeholder — token returned to caller for email delivery
    await this.issueEmailVerificationToken(user.id);

    const tokens = await this.issueTokenPair(user.id, user.email);
    return { user, tokens };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const record = await this.userRepo.findByEmailWithPassword(dto.email);
    if (!record) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    if (record.status === 'DELETED') throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    if (record.status === 'SUSPENDED') throw HttpError.Forbidden('Account suspended', 'ACCOUNT_SUSPENDED');
    if (!record.passwordHash) throw HttpError.Unauthorized('Use OAuth to sign in', 'OAUTH_ONLY');

    const valid = await this.passwordService.verify(dto.password, record.passwordHash);
    if (!valid) throw HttpError.Unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

    const { passwordHash: _ph, ...user } = record;
    void _ph;

    const tokens = await this.issueTokenPair(user.id, user.email, dto.deviceInfo);
    return { user, tokens };
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

    const user = await this.userRepo.findById(stored.userId);
    if (!user || user.status !== 'ACTIVE') {
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
    await this.userRepo.markEmailVerified(record.userId);
    await this.authRepo.deleteEmailVerificationToken(record.id);
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  async issuePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.userRepo.findByEmail(email);
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
