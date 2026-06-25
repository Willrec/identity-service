import type { User } from '@prisma/client';
import type { INotificationService } from './notification.service.js';
import { logger } from '../../../shared/logger.js';

export class DevelopmentNotificationService implements INotificationService {
  async sendVerificationEmail(user: Pick<User, 'id' | 'email'>, token: string): Promise<void> {
    logger.info(`[Development] Verification token for ${user.email}: ${token}`);
  }

  async sendPasswordResetEmail(user: Pick<User, 'id' | 'email'>, token: string): Promise<void> {
    logger.info(`[Development] Password reset token for ${user.email}: ${token}`);
  }
}
