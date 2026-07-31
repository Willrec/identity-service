import type { IEmailTemplate } from '../templates/email-template.js';

/**
 * ITemplateRenderer
 *
 * Application interface for concrete rendering implementations (e.g. Handlebars, MJML).
 * Responsible only for rendering template data into a string layout.
 */
export interface ITemplateRenderer {
  /**
   * render
   *
   * Renders the given template instance to its final string layout body.
   */
  render(template: IEmailTemplate): Promise<string>;
}
