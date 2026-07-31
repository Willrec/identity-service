import type { UserStatus } from '../../../shared/types/domain.types.js';

// ── Read model ────────────────────────────────────────────────────────────────

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ── Write models ──────────────────────────────────────────────────────────────

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash?: string;
  avatarUrl?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  status?: UserStatus;
}

export interface UserPasswordRecord {
  id: string;
  passwordHash: string | null;
}
