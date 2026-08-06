import type { IAuthRepository } from '../repositories/auth.repository.interface.js';
import type { SessionService } from './session.service.js';
import type { TokenService } from './token.service.js';
import type { TokenService as JwtTokenService } from '../../../infrastructure/security/jwt.js';
import type { DeviceInfoDto, LoginResponseDto, AuthenticationEvent } from '../dto/auth.dto.js';
import type { UserStatus } from '../../../shared/types/domain.types.js';

/**
 * AuthenticationPipelineService
 *
 * Centralized service responsible for orchestrating the post-verification
 * session establishment, token issuance, and logging pipeline.
 */
export class AuthenticationPipelineService {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly jwtTokenService: JwtTokenService
  ) {}

  /**
   * authenticateUser
   *
   * Coordinates session creation, refresh token persistence, access token generation,
   * and audit trailing for both password and OAuth authentication flows.
   */
  async authenticateUser(
    userId: string,
    email: string,
    status: string,
    event: AuthenticationEvent,
    deviceInfo?: DeviceInfoDto
  ): Promise<LoginResponseDto> {
    const session = await this.sessionService.create(userId, deviceInfo);
    const refreshToken = await this.tokenService.issueRefreshToken(userId, session.id);

    await this.authRepo.createAuditLog({
      userId,
      action: event,
      metadata: { email },
    });

    const accessToken = this.jwtTokenService.signAccessToken({
      id: userId,
      email,
      status,
    });

    return {
      user: { id: userId, email, status: status as UserStatus },
      accessToken,
      refreshToken,
    };
  }
}
