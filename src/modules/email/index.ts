export type { Email, EmailAttachment } from './domain/models/email.model.js';
export type { IEmailProvider } from './domain/contracts/email-provider.interface.js';
export type { EmailTemplate } from './domain/contracts/email-template.interface.js';
export type { ITemplateRenderer } from './domain/contracts/template-renderer.interface.js';
export { EmailService, type SendEmailCommand } from './application/services/email.service.js';
