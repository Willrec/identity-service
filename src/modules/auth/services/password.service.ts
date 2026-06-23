import bcrypt from 'bcrypt';
import { env } from '../../../config/env.js';

const SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;

export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
