/**
 * EmailTemplate
 *
 * Domain contract representing an email template with a unique identifier
 * and dynamic context data to be rendered.
 */
export interface EmailTemplate {
  readonly templateId: string;
  readonly context: Record<string, unknown>;
}
