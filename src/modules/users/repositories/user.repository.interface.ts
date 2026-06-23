import type { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto.js';
import type { Prisma } from '@prisma/client';

export interface IUserRepository {
  findById(id: string): Promise<UserResponseDto | null>;
  findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<UserResponseDto | null>;
  /** Returns full record including passwordHash — never expose in responses */
  findByEmailWithPassword(
    email: string,
    tx?: Prisma.TransactionClient
  ): Promise<(UserResponseDto & { passwordHash: string | null }) | null>;
  create(data: CreateUserDto, tx?: Prisma.TransactionClient): Promise<UserResponseDto>;
  update(id: string, data: UpdateUserDto, tx?: Prisma.TransactionClient): Promise<UserResponseDto>;
  markAsDeleted(id: string, tx?: Prisma.TransactionClient): Promise<void>;
  markEmailVerified(id: string, tx?: Prisma.TransactionClient): Promise<void>;
  assignRole(userId: string, roleName: string, tx?: Prisma.TransactionClient): Promise<void>;
  /** Temporary — used by health check to verify DB connectivity via auth.users */
  countUsers(): Promise<number>;
}
