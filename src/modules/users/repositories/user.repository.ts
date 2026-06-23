import type { PrismaClient, User } from '@prisma/client';
import type { IUserRepository } from './user.repository.interface.js';
import type { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto.js';

// ── Mapper ────────────────────────────────────────────────────────────────────

function toResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ── Implementation ────────────────────────────────────────────────────────────

export class UserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? toResponse(user) : null;
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.db.user.findUnique({ where: { email } });
    return user ? toResponse(user) : null;
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<(UserResponseDto & { passwordHash: string | null }) | null> {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) return null;
    return { ...toResponse(user), passwordHash: user.passwordHash };
  }

  async create(data: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.db.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: data.passwordHash ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
    });
    return toResponse(user);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.db.user.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
        ...(data.status !== undefined && { status: data.status }),
        updatedAt: new Date(),
      },
    });
    return toResponse(user);
  }

  async markAsDeleted(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { status: 'DELETED', updatedAt: new Date() },
    });
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { emailVerified: true, updatedAt: new Date() },
    });
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const role = await this.db.role.findUnique({ where: { name: roleName } });
    if (!role) return; // role not seeded yet — skip silently
    await this.db.userRole.create({ data: { userId, roleId: role.id } });
  }

  async countUsers(): Promise<number> {
    return this.db.user.count();
  }
}
