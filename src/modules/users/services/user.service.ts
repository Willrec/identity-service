import type { IUserRepository } from '../repositories/user.repository.interface.js';
import type { UserResponseDto, UpdateUserDto } from '../dto/user.dto.js';
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

  async getByEmail(email: string): Promise<UserResponseDto | null> {
    return this.userRepo.findByEmail(email.toLowerCase());
  }

  async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    await this.getById(id); // ensure exists and not deleted
    return this.userRepo.update(id, data);
  }

  async markAsDeleted(id: string): Promise<void> {
    await this.getById(id);
    await this.userRepo.markAsDeleted(id);
  }
}
