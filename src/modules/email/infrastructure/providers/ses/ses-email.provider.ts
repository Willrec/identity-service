import { SendEmailCommand } from '@aws-sdk/client-ses';
import type { SESClient } from '@aws-sdk/client-ses';
import type { IEmailProvider } from '../../../domain/contracts/email-provider.interface.js';
import type { Email } from '../../../domain/models/email.model.js';
import { EmailDispatchError } from '../../../errors/email-dispatch.error.js';

export interface SesEmailProviderConfig {
  readonly defaultFrom: string;
}

/**
 * SesEmailProvider
 *
 * Concrete implementation of IEmailProvider using AWS SDK v3 SES Client.
 * Designed to be technology-agnostic and reusable.
 */
export class SesEmailProvider implements IEmailProvider {
  constructor(
    private readonly sesClient: SESClient,
    private readonly config: SesEmailProviderConfig
  ) {}

  /**
   * send
   *
   * Maps domain Email request model to AWS SES SendEmailCommand input parameters
   * and executes delivery via the injected SESClient instance.
   */
  async send(email: Email): Promise<void> {
    const fromAddress = email.from ?? this.config.defaultFrom;
    
    const toAddresses = Array.isArray(email.to) ? email.to : [email.to];
    const ccAddresses = email.cc ? (Array.isArray(email.cc) ? email.cc : [email.cc]) : undefined;
    const bccAddresses = email.bcc ? (Array.isArray(email.bcc) ? email.bcc : [email.bcc]) : undefined;

    const command = new SendEmailCommand({
      Source: fromAddress,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses,
        BccAddresses: bccAddresses,
      },
      Message: {
        Subject: {
          Charset: 'UTF-8', // Hardcoded as a module-wide UTF-8 encoding decision.
          Data: email.subject,
        },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: email.body,
          },
          // Future plain-text body support:
          // ...(email.textBody ? { Text: { Charset: 'UTF-8', Data: email.textBody } } : {})
        },
      },
      ReplyToAddresses: email.replyTo ? [email.replyTo] : undefined,
    });

    try {
      await this.sesClient.send(command);
    } catch (error) {
      throw new EmailDispatchError(`SES Email dispatch failed: ${(error as Error).message}`, { cause: error });
    }
  }
}
