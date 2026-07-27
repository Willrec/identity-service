import type { IEmailProvider } from '../../domain/contracts/email-provider.interface.js';
import type { ITemplateRenderer } from '../../domain/contracts/template-renderer.interface.js';
import type { EmailTemplate } from '../../domain/contracts/email-template.interface.js';

/**
 * SendEmailCommand
 *
 * Command object encapsulating parameters for rendering and sending a template email.
 * Decouples service API signature from primitive parameters.
 */
export interface SendEmailCommand {
  readonly to: string | string[];
  readonly subject: string;
  readonly template: EmailTemplate;
}

/**
 * EmailService
 *
 * Application service responsible for orchestrating the email delivery process.
 * Decoupled from physical transport layers and templates.
 */
export class EmailService {
  constructor(
    private readonly emailProvider: IEmailProvider,
    private readonly templateRenderer: ITemplateRenderer
  ) {}

  /**
   * sendTemplateEmail
   *
   * Orchestrates the template rendering and deliveries via a request command object.
   */
  async sendTemplateEmail(command: SendEmailCommand): Promise<void> {
    const body = await this.templateRenderer.render(command.template);
    await this.emailProvider.send({
      to: command.to,
      subject: command.subject,
      body,
    });
  }
}
