import type { IAuthRepository, SessionData } from '../repositories/auth.repository.interface.js';
import type { DeviceInfoDto } from '../dto/auth.dto.js';
import { REFRESH_TOKEN_TTL_S } from '../../../config/constants.js';

export class SessionService {
  constructor(private readonly authRepo: IAuthRepository) {}

  async create(userId: string, deviceInfo?: DeviceInfoDto): Promise<SessionData> {
    return this.authRepo.createSession({
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_S * 1000),
      ...(deviceInfo?.ip && { ip: deviceInfo.ip }),
      ...(deviceInfo?.userAgent && { userAgent: deviceInfo.userAgent }),
      ...(deviceInfo?.deviceName && { deviceName: deviceInfo.deviceName }),
      ...(deviceInfo?.browser && { browser: deviceInfo.browser }),
      ...(deviceInfo?.operatingSystem && { operatingSystem: deviceInfo.operatingSystem }),
    });
  }

  async findById(id: string): Promise<SessionData | null> {
    return this.authRepo.findSessionById(id);
  }

  async revoke(id: string): Promise<void> {
    return this.authRepo.revokeSession(id);
  }

  async revokeAll(userId: string): Promise<void> {
    return this.authRepo.revokeAllUserSessions(userId);
  }

  async touch(id: string, lastSeenAt = new Date()): Promise<void> {
    return this.authRepo.touchSession(id, lastSeenAt);
  }
}
