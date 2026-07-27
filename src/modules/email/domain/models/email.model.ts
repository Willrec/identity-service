export interface EmailAttachment {
  readonly filename: string;
  readonly content: Buffer | string;
  readonly contentType?: string | undefined;
}

/**
 * Email
 *
 * Domain model representing a fully formed email ready for dispatch.
 * Designed with optional fields for future capabilities to avoid breaking API changes.
 * Incorporates explicit undefined types for compatibility with strict TS exactOptionalPropertyTypes.
 */
export interface Email {
  readonly to: string | string[];
  readonly subject: string;
  readonly body: string;
  readonly from?: string | undefined;
  
  // Future capability placeholders
  readonly cc?: string | string[] | undefined;
  readonly bcc?: string | string[] | undefined;
  readonly replyTo?: string | undefined;
  readonly attachments?: EmailAttachment[] | undefined;
  readonly headers?: Record<string, string> | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}
