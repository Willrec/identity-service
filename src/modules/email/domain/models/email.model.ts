export interface EmailAttachment {
  readonly filename: string;
  readonly content: Buffer | string;
  readonly contentType?: string;
}

/**
 * Email
 *
 * Domain model representing a fully formed email ready for dispatch.
 * Designed with optional fields for future capabilities to avoid breaking API changes.
 */
export interface Email {
  readonly to: string | string[];
  readonly subject: string;
  readonly body: string;
  readonly from?: string;
  
  // Future capability placeholders
  readonly cc?: string | string[];
  readonly bcc?: string | string[];
  readonly replyTo?: string;
  readonly attachments?: EmailAttachment[];
  readonly headers?: Record<string, string>;
  readonly metadata?: Record<string, unknown>;
}
