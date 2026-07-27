export type { Email, EmailAttachment } from './domain/models/email.model.js';
export type { IEmailProvider } from './domain/contracts/email-provider.interface.js';

export type { IEmailTemplate } from './application/templates/email-template.js';
export { VerifyEmailTemplate } from './application/templates/verify-email.template.js';
export { PasswordResetTemplate } from './application/templates/password-reset.template.js';
export { WelcomeTemplate } from './application/templates/welcome.template.js';

export type { ITemplateRenderer } from './application/contracts/template-renderer.interface.js';
export { EmailService } from './application/services/email.service.js';
export type { SendEmailCommand, SendOptions } from './application/services/email.service.js';
