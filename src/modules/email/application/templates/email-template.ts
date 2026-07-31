/**
 * IEmailTemplate
 *
 * Application contract representing a transactional email template use case.
 * Implementations encapsulate the subject and domain data variables required for rendering.
 */
export interface IEmailTemplate {
  /**
   * generateSubject
   *
   * Resolves the localized subject line for this transactional email.
   */
  generateSubject(): string;
}
