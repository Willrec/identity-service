import type { ITemplateRenderer } from '../../application/contracts/template-renderer.interface.js';
import type { IEmailTemplate } from '../../application/templates/email-template.js';

/**
 * TemplateRenderer
 *
 * Infrastructure implementation stub for parsing and rendering email templates.
 * Responsible only for rendering template data into a string layout.
 */
export class TemplateRenderer implements ITemplateRenderer {
  /**
   * render
   *
   * Renders the given template instance to its final string layout body.
   */
  render(template: IEmailTemplate): Promise<string> {
    return Promise.reject(new Error(`Method not implemented: TemplateRenderer.render for ${template.constructor.name}`));
  }
}
