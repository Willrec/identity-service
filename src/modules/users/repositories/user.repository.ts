import type { PrismaClient, User, Prisma } from '@prisma/client';
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

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<UserResponseDto | null> {
    const client = tx ?? this.db;
    const user = await client.user.findUnique({ where: { id } });
    return user ? toResponse(user) : null;
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<UserResponseDto | null> {
    const client = tx ?? this.db;
    const user = await client.user.findUnique({ where: { email } });
    return user ? toResponse(user) : null;
  }

  async findByEmailWithPassword(
    email: string,
    tx?: Prisma.TransactionClient
  ): Promise<(UserResponseDto & { passwordHash: string | null }) | null> {
    const client = tx ?? this.db;
    const user = await client.user.findUnique({ where: { email } });
    if (!user) return null;
    return { ...toResponse(user), passwordHash: user.passwordHash };
  }

  async create(data: CreateUserDto, tx?: Prisma.TransactionClient): Promise<UserResponseDto> {
    const client = tx ?? this.db;
    const user = await client.user.create({
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

  async update(id: string, data: UpdateUserDto, tx?: Prisma.TransactionClient): Promise<UserResponseDto> {
    const client = tx ?? this.db;
    const user = await client.user.update({
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

  async markAsDeleted(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.db;
    await client.user.update({
      where: { id },
      data: { status: 'DELETED', updatedAt: new Date() },
    });
  }

  async markEmailVerified(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.db;
    await client.user.update({
      where: { id },
      data: { emailVerified: true, updatedAt: new Date() },
    });
  }

  async updatePassword(id: string, passwordHash: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.db;
    await client.user.update({
      where: { id },
      data: { passwordHash, updatedAt: new Date() },
    });
  }

  async assignRole(userId: string, roleName: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.db;
    const role = await client.role.findUnique({ where: { name: roleName } });
    if (!role) return; // role not seeded yet — skip silently
    await client.userRole.create({ data: { userId, roleId: role.id } });
  }

  async countUsers(): Promise<number> {
    return this.db.user.count();
  }
}
