import type { IUserRepository } from '../repositories/user.repository.interface.js';
import type { Prisma } from '@prisma/client';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '../dto/user.dto.js';
import { HttpError } from '../../../shared/errors/HttpError.js';

export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findById(id);
    if (!user || user.status === 'DELETED') {
      throw HttpError.NotFound('User not found', 'USER_NOT_FOUND');
    }
    return user;
  }

  async getRawById(id: string): Promise<UserResponseDto | null> {
    return this.userRepo.findById(id);
  }

  async getByEmail(email: string): Promise<UserResponseDto | null> {
    return this.userRepo.findByEmail(email.toLowerCase());
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<(UserResponseDto & { passwordHash: string | null }) | null> {
    return this.userRepo.findByEmailWithPassword(email.toLowerCase());
  }

  /**
   * Validates uniqueness, then creates the user record.
   * Password must already be hashed by the caller (PasswordService).
   */
  async createUser(dto: CreateUserDto, tx?: Prisma.TransactionClient): Promise<UserResponseDto> {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.userRepo.findByEmail(normalizedEmail, tx);
    if (existing) throw HttpError.BadRequest('Email already registered', 'EMAIL_TAKEN');
    return this.userRepo.create({ ...dto, email: normalizedEmail }, tx);
  }

  async update(id: string, data: UpdateUserDto, tx?: Prisma.TransactionClient): Promise<UserResponseDto> {
    await this.getById(id);
    return this.userRepo.update(id, data, tx);
  }

  async markAsDeleted(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getById(id);
    await this.userRepo.markAsDeleted(id, tx);
  }

  async markEmailVerified(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.userRepo.markEmailVerified(id, tx);
  }

  async assignRole(userId: string, roleName: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.userRepo.assignRole(userId, roleName, tx);
  }

  /** Temporary — delegates to repository for health check vertical slice */
  async countUsers(): Promise<number> {
    return this.userRepo.countUsers();
  }
}
