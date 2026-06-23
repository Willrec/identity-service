import type { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto.js';

export interface IUserRepository {
  findById(id: string): Promise<UserResponseDto | null>;
  findByEmail(email: string): Promise<UserResponseDto | null>;
  /** Returns full record including passwordHash — never expose in responses */
  findByEmailWithPassword(
    email: string,
  ): Promise<(UserResponseDto & { passwordHash: string | null }) | null>;
  create(data: CreateUserDto): Promise<UserResponseDto>;
  update(id: string, data: UpdateUserDto): Promise<UserResponseDto>;
  markAsDeleted(id: string): Promise<void>;
  markEmailVerified(id: string): Promise<void>;
  /** Temporary — used by health check to verify DB connectivity via auth.users */
  countUsers(): Promise<number>;
}
