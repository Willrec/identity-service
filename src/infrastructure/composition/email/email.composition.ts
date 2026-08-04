import { SESClient } from '@aws-sdk/client-ses';
import { env } from '../../../config/env.js';
import { SesEmailProvider } from '../../../modules/email/infrastructure/providers/ses/ses-email.provider.js';
import { TemplateRenderer } from '../../../modules/email/infrastructure/templates/template-renderer.js';
import { EmailService } from '../../../modules/email/index.js';

/**
 * composeEmailModule
 *
 * Factory function responsible for assembling the Email module dependencies.
 * Resolves configuration and instantiates infrastructure classes.
 */
export function composeEmailModule(): EmailService {
  // Construct the AWS SESClient instance.
  // Falls back to the AWS Default Credential Provider Chain if AWS_ACCESS_KEY_ID is not explicitly configured.
  const sesClient = new SESClient({
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });

  // Construct the reusable Amazon SES email provider
  const emailProvider = new SesEmailProvider(sesClient, {
    defaultFrom: env.EMAIL_FROM,
  });

  // Construct the concrete template rendering engine (extension point)
  const templateRenderer = new TemplateRenderer();

  // Return the fully composed EmailService
  return new EmailService(emailProvider, templateRenderer);
}
