import type { IEmailTemplate } from './email-template.js';

/**
 * VerifyEmailTemplate
 *
 * Represents the email verification transactional email use case.
 * Encapsulates the target email and verification token.
 */
export class VerifyEmailTemplate implements IEmailTemplate {
  constructor(
    public readonly email: string,
    public readonly token: string
  ) {}

  generateSubject(): string {
    return 'Verifique su correo electrónico';
  }
}
