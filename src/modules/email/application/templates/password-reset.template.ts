import type { IEmailTemplate } from './email-template.js';

/**
 * PasswordResetTemplate
 *
 * Represents the password reset transactional email use case.
 * Encapsulates the target email and password reset token.
 */
export class PasswordResetTemplate implements IEmailTemplate {
  constructor(
    public readonly email: string,
    public readonly token: string
  ) {}

  generateSubject(): string {
    return 'Restablecer su contraseña';
  }
}
