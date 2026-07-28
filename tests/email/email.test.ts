import { describe, it, expect, vi } from 'vitest';
import { VerifyEmailTemplate } from '../../src/modules/email/application/templates/verify-email.template.js';
import { PasswordResetTemplate } from '../../src/modules/email/application/templates/password-reset.template.js';
import { WelcomeTemplate } from '../../src/modules/email/application/templates/welcome.template.js';
import { EmailDispatchError } from '../../src/modules/email/errors/email-dispatch.error.js';
import { EmailService } from '../../src/modules/email/application/services/email.service.js';
import { SesEmailProvider } from '../../src/modules/email/infrastructure/providers/ses/ses-email.provider.js';
import { SESClient } from '@aws-sdk/client-ses';

describe('Email Module Unit Tests', () => {
  describe('Email Templates', () => {
    it('VerifyEmailTemplate should generate subject and contain variables', () => {
      const template = new VerifyEmailTemplate('test@example.com', 'token123');
      expect(template.generateSubject()).toBe('Verify your email address');
      expect(template.email).toBe('test@example.com');
      expect(template.token).toBe('token123');
    });

    it('PasswordResetTemplate should generate subject and contain variables', () => {
      const template = new PasswordResetTemplate('test@example.com', 'token123');
      expect(template.generateSubject()).toBe('Reset your password');
      expect(template.email).toBe('test@example.com');
      expect(template.token).toBe('token123');
    });

    it('WelcomeTemplate should generate subject and contain variables', () => {
      const template = new WelcomeTemplate('John Doe');
      expect(template.generateSubject()).toBe('Welcome to Elevo!');
      expect(template.name).toBe('John Doe');
    });
  });

  describe('EmailDispatchError', () => {
    it('should set name and message and accept cause options', () => {
      const originalErr = new Error('AWS SES Error');
      const err = new EmailDispatchError('Dispatch failed', { cause: originalErr });
      expect(err.name).toBe('EmailDispatchError');
      expect(err.message).toBe('Dispatch failed');
      expect(err.cause).toBe(originalErr);
    });
  });

  describe('EmailService', () => {
    it('should render template and delegate send to provider', async () => {
      const mockProvider = {
        send: vi.fn().mockResolvedValue(undefined),
      };
      const mockRenderer = {
        render: vi.fn().mockResolvedValue('<html>body</html>'),
      };
      const emailService = new EmailService(mockProvider, mockRenderer);
      const template = new WelcomeTemplate('John Doe');

      await emailService.sendTemplateEmail({
        to: 'test@example.com',
        template,
        options: {
          from: 'sender@example.com',
          cc: 'cc@example.com',
          bcc: 'bcc@example.com',
          replyTo: 'reply@example.com',
        },
      });

      expect(mockRenderer.render).toHaveBeenCalledWith(template);
      expect(mockProvider.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Welcome to Elevo!',
        body: '<html>body</html>',
        from: 'sender@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        replyTo: 'reply@example.com',
      });
    });
  });

  describe('SesEmailProvider', () => {
    it('should build and send correct SES command', async () => {
      const mockSesClient = {
        send: vi.fn().mockResolvedValue({ MessageId: '123' }),
      } as unknown as SESClient;

      const provider = new SesEmailProvider(mockSesClient, { defaultFrom: 'no-reply@example.com' });
      
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Subject Line',
        body: 'HTML Body',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        replyTo: 'reply@example.com',
      };

      await provider.send(emailData);

      expect(mockSesClient.send).toHaveBeenCalled();
    });

    it('should throw EmailDispatchError when SES client send fails', async () => {
      const mockSesClient = {
        send: vi.fn().mockRejectedValue(new Error('SES Outage')),
      } as unknown as SESClient;

      const provider = new SesEmailProvider(mockSesClient, { defaultFrom: 'no-reply@example.com' });
      
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Subject Line',
        body: 'HTML Body',
      };

      await expect(provider.send(emailData)).rejects.toThrow(EmailDispatchError);
    });
  });
});
