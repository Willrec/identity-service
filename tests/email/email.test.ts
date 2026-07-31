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
      expect(template.generateSubject()).toBe('Verifique su correo electrónico');
      expect(template.email).toBe('test@example.com');
      expect(template.token).toBe('token123');
    });

    it('PasswordResetTemplate should generate subject and contain variables', () => {
      const template = new PasswordResetTemplate('test@example.com', 'token123');
      expect(template.generateSubject()).toBe('Restablecer su contraseña');
      expect(template.email).toBe('test@example.com');
      expect(template.token).toBe('token123');
    });

    it('WelcomeTemplate should generate subject and contain variables', () => {
      const template = new WelcomeTemplate('John Doe');
      expect(template.generateSubject()).toBe('Bienvenido');
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
        subject: 'Bienvenido',
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

    it('should handle array parameters for to, cc, and bcc', async () => {
      const mockSesClient = {
        send: vi.fn().mockResolvedValue({ MessageId: '123' }),
      } as unknown as SESClient;

      const provider = new SesEmailProvider(mockSesClient, { defaultFrom: 'no-reply@example.com' });
      
      const emailData = {
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Subject Line',
        body: 'HTML Body',
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        replyTo: 'reply@example.com',
        from: 'custom-from@example.com',
      };

      await provider.send(emailData);

      expect(mockSesClient.send).toHaveBeenCalled();
    });
  });
});

import { HttpError } from '../../src/shared/errors/HttpError.js';

describe('HttpError Helpers', () => {
  it('should use default arguments when none are provided', () => {
    const badRequest = HttpError.BadRequest();
    expect(badRequest.message).toBe('Bad Request');
    expect(badRequest.code).toBe('BAD_REQUEST');
    expect(badRequest.statusCode).toBe(400);

    const unauthorized = HttpError.Unauthorized();
    expect(unauthorized.message).toBe('Unauthorized');
    expect(unauthorized.code).toBe('UNAUTHORIZED');
    expect(unauthorized.statusCode).toBe(401);

    const forbidden = HttpError.Forbidden();
    expect(forbidden.message).toBe('Forbidden');
    expect(forbidden.code).toBe('FORBIDDEN');
    expect(forbidden.statusCode).toBe(403);

    const notFound = HttpError.NotFound();
    expect(notFound.message).toBe('Not Found');
    expect(notFound.code).toBe('NOT_FOUND');
    expect(notFound.statusCode).toBe(404);

    const conflict = HttpError.Conflict();
    expect(conflict.message).toBe('Conflict');
    expect(conflict.code).toBe('CONFLICT');
    expect(conflict.statusCode).toBe(409);

    const internalServer = HttpError.InternalServer();
    expect(internalServer.message).toBe('Internal Server Error');
    expect(internalServer.code).toBe('INTERNAL_SERVER_ERROR');
    expect(internalServer.statusCode).toBe(500);
  });
});
