import type { User } from '@prisma/client';

export interface INotificationService {
  sendVerificationEmail(user: Pick<User, 'id' | 'email'>, token: string): Promise<void>;
}
