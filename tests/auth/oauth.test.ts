import { describe, it, expect, afterEach, vi } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma.js';
import { request } from '../setup/test-app.js';
import { cleanupData, createVerifiedUser, createSuspendedUser, createDeletedUser } from '../setup/helpers.js';
import { GoogleOAuthProvider } from '../../src/modules/oauth/infrastructure/providers/google/google-oauth.provider.js';
import { encrypt } from '../../src/shared/security/crypto.js';
import { env } from '../../src/config/env.js';
import { OAuthDuplicateEmailError } from '../../src/modules/oauth/application/errors/oauth-duplicate-email.error.js';
import { OAuthRepository } from '../../src/modules/oauth/repositories/oauth.repository.js';
import type { OAuthProviderType } from '../../src/modules/oauth/index.js';

// Helper to encrypt flow cookies to match the real encrypt/decrypt implementation
function makeOAuthSessionCookie(state: string, codeVerifier: string): string {
  const payload = JSON.stringify({ state, codeVerifier });
  const encrypted = encrypt(payload, env.OAUTH_COOKIE_SECRET);
  return `__Host-oauth-session=${encrypted}`;
}

const createdUserIds = new Set<string>();

describe('OAuth Authentication Endpoints', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupData();
    if (createdUserIds.size > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: Array.from(createdUserIds) } },
      });
      createdUserIds.clear();
    }
  });

  // ── 1. Authorization Endpoint ─────────────────────────────────────────────

  describe('GET /api/v1/auth/oauth/google', () => {
    it('initiates the flow, creates flow cookies, and redirects to Google', async () => {
      const res = await request.get('/api/v1/auth/oauth/google');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(res.headers.location).toContain('client_id=');
      expect(res.headers.location).toContain('state=');
      expect(res.headers.location).toContain('code_challenge=');

      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      const oauthCookie = cookies.find((c) => c.startsWith('__Host-oauth-session='));
      expect(oauthCookie).toBeDefined();
      expect(oauthCookie).toContain('HttpOnly');
      expect(oauthCookie).toContain('Secure');
    });
  });

  // ── 2. Callback Endpoint ──────────────────────────────────────────────────

  describe('GET /api/v1/auth/oauth/google/callback', () => {
    it('rejects callback if authorization code or state is missing', async () => {
      const res = await request.get('/api/v1/auth/oauth/google/callback');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OAUTH_STATE_ERROR');
    });

    it('rejects callback if flow cookie is missing (expired/non-existent)', async () => {
      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: 'state-123' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Missing OAuth flow session cookie');
    });

    it('rejects callback if state does not match cookie (CSRF mismatch)', async () => {
      const cookie = makeOAuthSessionCookie('cookie-state', 'verifier-123');
      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: 'different-state' })
        .set('Cookie', [cookie]);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('CSRF state mismatch detected');
    });

    it('provisions a new user on successful first-time oauth login', async () => {
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);

      const email = 'new-oauth-user@example.com';
      const googleUserId = 'google-sub-123';

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockResolvedValue({
        accessToken: 'access-token-123',
        expiresIn: 3600,
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'getProfile').mockResolvedValue({
        providerUserId: googleUserId,
        email,
        emailVerified: true,
        firstName: 'Oauth',
        lastName: 'User',
        pictureUrl: 'http://avatar.url',
      });

      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.accessToken).toBeDefined();

      const user = await prisma.user.findUnique({
        where: { email },
        include: { oauthAccounts: true, auditLogs: true },
      });

      expect(user).toBeTruthy();
      createdUserIds.add(user!.id);
      expect(user!.emailVerified).toBe(true);
      expect(user!.oauthAccounts.length).toBe(1);
      expect(user!.oauthAccounts[0].provider).toBe('google');
      expect(user!.oauthAccounts[0].providerUserId).toBe(googleUserId);

      const auditCreated = user!.auditLogs.find((l) => l.action === 'OAUTH_ACCOUNT_CREATED');
      expect(auditCreated).toBeDefined();
    });

    it('links existing verified user automatically on oauth email collision', async () => {
      const { payload } = await createVerifiedUser();
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);

      const googleUserId = 'google-sub-456';

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockResolvedValue({
        accessToken: 'access-token-123',
        expiresIn: 3600,
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'getProfile').mockResolvedValue({
        providerUserId: googleUserId,
        email: payload.email,
        emailVerified: true,
        firstName: 'Different',
        lastName: 'Name',
      });

      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { email: payload.email },
        include: { oauthAccounts: true, auditLogs: true },
      });

      expect(user!.oauthAccounts.length).toBe(1);
      expect(user!.oauthAccounts[0].providerUserId).toBe(googleUserId);

      // Local details should not be overwritten
      expect(user!.firstName).toBe(payload.firstName);

      const auditLinked = user!.auditLogs.find((l) => l.action === 'OAUTH_ACCOUNT_LINKED');
      expect(auditLinked).toBeDefined();
    });

    it('rejects auto-linking if the OAuth provider email is unverified', async () => {
      const { payload } = await createVerifiedUser();
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockResolvedValue({
        accessToken: 'access-token-123',
        expiresIn: 3600,
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'getProfile').mockResolvedValue({
        providerUserId: 'google-sub-789',
        email: payload.email,
        emailVerified: false, // unverified email!
      });

      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_UNVERIFIED');
    });

    it('authenticates directly for an existing oauth account link', async () => {
      const { payload } = await createVerifiedUser();
      const googleUserId = 'google-sub-already-linked';
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);

      // Pre-link user to OAuth account
      const userRecord = await prisma.user.findUnique({ where: { email: payload.email } });
      await prisma.oauthAccount.create({
        data: {
          userId: userRecord!.id,
          provider: 'google',
          providerUserId: googleUserId,
        },
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockResolvedValue({
        accessToken: 'access-token-123',
        expiresIn: 3600,
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'getProfile').mockResolvedValue({
        providerUserId: googleUserId,
        email: payload.email,
        emailVerified: true,
      });

      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);

      expect(res.status).toBe(200);

      const user = await prisma.user.findUnique({
        where: { email: payload.email },
        include: { auditLogs: true },
      });

      const auditLogin = user!.auditLogs.find((l) => l.action === 'OAUTH_LOGIN_SUCCESS');
      expect(auditLogin).toBeDefined();
    });

    it('prevents replay attacks by invalidating the flow session cookie immediately', async () => {
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockResolvedValue({
        accessToken: 'access-token-123',
        expiresIn: 3600,
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'getProfile').mockResolvedValue({
        providerUserId: 'google-sub-replay',
        email: 'replay-user@example.com',
        emailVerified: true,
      });

      // First request succeeds
      const res1 = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);
      expect(res1.status).toBe(200);
      createdUserIds.add(res1.body.data.user.id);

      // Verify cookies cleared header was returned in res1
      const setCookie = res1.headers['set-cookie'] as string[];
      const oauthCleared = setCookie.find((c) => c.startsWith('__Host-oauth-session=;'));
      expect(oauthCleared).toBeDefined();

      // Second request with the same cookie value fails (cleared)
      const res2 = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);
      expect(res2.status).toBe(400);
      expect(res2.body.error.message).toContain('Missing OAuth flow session cookie');
    });

    it('blocks suspended and deleted users from logging in via oauth', async () => {
      const { payload: suspendedPayload } = await createSuspendedUser();
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockResolvedValue({
        accessToken: 'access-token-123',
        expiresIn: 3600,
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'getProfile').mockResolvedValue({
        providerUserId: 'sub-suspended',
        email: suspendedPayload.email,
        emailVerified: true,
      });

      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('rolls back database modifications completely on provider or networking failures', async () => {
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);
      const email = 'fail-rollback-user@example.com';

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockRejectedValue(
        new Error('Google network connection timeout')
      );

      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);

      expect(res.status).toBe(500);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeNull(); // Assert rolled back completely
    });

    it('handles concurrent provisioning race condition via fallback account linking', async () => {
      const state = 'valid-state';
      const codeVerifier = 'valid-verifier-123';
      const cookie = makeOAuthSessionCookie(state, codeVerifier);
      const email = 'race-condition-user@example.com';
      const googleUserId = 'google-race-123';

      vi.spyOn(GoogleOAuthProvider.prototype, 'exchangeCode').mockResolvedValue({
        accessToken: 'access-token-123',
        expiresIn: 3600,
      });

      vi.spyOn(GoogleOAuthProvider.prototype, 'getProfile').mockResolvedValue({
        providerUserId: googleUserId,
        email,
        emailVerified: true,
        firstName: 'Race',
        lastName: 'Condition',
      });

      // Mock repository.createUser to throw an OAuthDuplicateEmailError to simulate email collision
      // but simultaneously write the user record to the DB directly (as if another thread inserted it)
      vi.spyOn(OAuthRepository.prototype, 'createUser').mockImplementationOnce(async (data) => {
        // Pre-create the user record concurrently
        const preCreated = await prisma.user.create({
          data: {
            email: data.email,
            emailVerified: data.emailVerified,
            firstName: data.firstName ?? '',
            lastName: data.lastName ?? '',
            status: 'ACTIVE',
          },
        });
        createdUserIds.add(preCreated.id);
        throw new OAuthDuplicateEmailError(data.email);
      });

      const res = await request
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state })
        .set('Cookie', [cookie]);

      // Flow should resolve successfully by linking to the concurrently created user
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { email },
        include: { oauthAccounts: true, auditLogs: true },
      });

      expect(user!.oauthAccounts.length).toBe(1);
      expect(user!.oauthAccounts[0].providerUserId).toBe(googleUserId);

      // Verify that OAUTH_ACCOUNT_LINKED was logged exactly once and no OAUTH_ACCOUNT_CREATED was logged
      const loggedCreated = user!.auditLogs.filter((l) => l.action === 'OAUTH_ACCOUNT_CREATED');
      const loggedLinked = user!.auditLogs.filter((l) => l.action === 'OAUTH_ACCOUNT_LINKED');
      expect(loggedCreated.length).toBe(0);
      expect(loggedLinked.length).toBe(1);
    });
  });
});
