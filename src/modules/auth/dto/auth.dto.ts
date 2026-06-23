import type { UserResponseDto } from '../../users/dto/user.dto.js';
import type { UserStatus } from '../../../shared/types/domain.types.js';

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
  /** Parsed from User-Agent header */
  deviceInfo?: DeviceInfoDto;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface VerifyEmailDto {
  token: string;
}

// ── Outputs ───────────────────────────────────────────────────────────────────

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthResponseDto {
  user: UserResponseDto;
  tokens: AuthTokensDto;
}

export interface RegisterResponseDto {
  id: string;
  email: string;
  status: UserStatus;
}

// ── Internal ──────────────────────────────────────────────────────────────────

export interface DeviceInfoDto {
  ip?: string;
  userAgent?: string;
  deviceName?: string;
  browser?: string;
  operatingSystem?: string;
}
