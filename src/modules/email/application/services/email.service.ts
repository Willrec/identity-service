import type { IEmailProvider } from '../../domain/contracts/email-provider.interface.js';
import type { ITemplateRenderer } from '../contracts/template-renderer.interface.js';
import type { IEmailTemplate } from '../templates/email-template.js';

/**
 * SendOptions
 *
 * Extensible configuration options for email dispatching.
 */
export interface SendOptions {
  readonly cc?: string | string[];
  readonly bcc?: string | string[];
  readonly replyTo?: string;
  readonly from?: string;
}

/**
 * SendEmailCommand
 *
 * Command object encapsulating all parameters for template-based email delivery.
 */
export interface SendEmailCommand {
  readonly to: string | string[];
  readonly template: IEmailTemplate;
  readonly options?: SendOptions;
}

/**
 * EmailService
 *
 * Application service responsible for orchestrating the email delivery process.
 * Decoupled from physical transport layers and template rendering engines.
 */
export class EmailService {
  constructor(
    private readonly emailProvider: IEmailProvider,
    private readonly templateRenderer: ITemplateRenderer
  ) {}

  /**
   * sendTemplateEmail
   *
   * Coordinates the rendering of a transactional email template and routes
   * it through the injected delivery provider.
   */
  async sendTemplateEmail(command: SendEmailCommand): Promise<void> {
    const subject = command.template.generateSubject();
    const body = await this.templateRenderer.render(command.template);
    
    await this.emailProvider.send({
      to: command.to,
      subject,
      body,
      from: command.options?.from,
      cc: command.options?.cc,
      bcc: command.options?.bcc,
      replyTo: command.options?.replyTo,
    });
  }
}
