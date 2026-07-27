import type { EmailTemplate } from './email-template.interface.js';

/**
 * ITemplateRenderer
 *
 * Domain contract for parsing and rendering email templates.
 */
export interface ITemplateRenderer {
  render(template: EmailTemplate): Promise<string>;
}
