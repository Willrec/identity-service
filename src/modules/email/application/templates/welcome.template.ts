import type { IEmailTemplate } from './email-template.js';

/**
 * WelcomeTemplate
 *
 * Represents the onboarding welcome transactional email use case.
 * Encapsulates the user's name.
 */
export class WelcomeTemplate implements IEmailTemplate {
  constructor(
    public readonly name: string
  ) {}

  generateSubject(): string {
    return 'Bienvenido a Elevo';
  }
}
