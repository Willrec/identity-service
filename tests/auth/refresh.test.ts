import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma.js';
import { cleanupData, authenticateClient, refresh } from '../setup/helpers.js';

describe('POST /api/v1/auth/refresh', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('rotates refresh token and csrf cookie on valid refresh', async () => {
    const { refreshCookie, csrfCookie } = await authenticateClient();
    
    const res = await refresh(refreshCookie, csrfCookie, csrfCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    const setCookie = res.headers['set-cookie'];
    let newRefresh = '';
    let newCsrf = '';
    for (const c of setCookie) {
      if (c.startsWith('__Host-refresh=')) {
        newRefresh = c.split(';')[0].split('=')[1];
      }
      if (c.startsWith('csrfToken=')) {
        newCsrf = c.split(';')[0].split('=')[1];
      }
    }
    
    expect(newRefresh).not.toBe(refreshCookie);
    expect(newCsrf).not.toBe(csrfCookie);
  });

  it('rejects missing CSRF header', async () => {
    const { refreshCookie, csrfCookie } = await authenticateClient();
    
    // Pass empty string for header
    const res = await refresh(refreshCookie, csrfCookie, '');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/csrf/i);
  });

  it('rejects missing CSRF cookie', async () => {
    const { refreshCookie, csrfCookie } = await authenticateClient();
    
    // Pass empty string for cookie
    const res = await refresh(refreshCookie, '', csrfCookie);
    expect(res.status).toBe(403);
  });

  it('rejects invalid/mismatched CSRF token', async () => {
    const { refreshCookie, csrfCookie } = await authenticateClient();
    
    const res = await refresh(refreshCookie, csrfCookie, 'some-wrong-header');
    expect(res.status).toBe(403);
  });

  it('rejects revoked refresh token', async () => {
    const { refreshCookie, csrfCookie, userPayload } = await authenticateClient();
    
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email: userPayload.email } });
    
    // Revoke their tokens manually
    await prisma.refreshToken.updateMany({
      where: { userId: user?.id },
      data: { revoked: true, revokedAt: new Date() }
    });

    const res = await refresh(refreshCookie, csrfCookie, csrfCookie);
    expect(res.status).toBe(401);
  });

  it('rejects expired refresh token', async () => {
    const { refreshCookie, csrfCookie, userPayload } = await authenticateClient();
    
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email: userPayload.email } });
    
    // Expire their tokens manually
    await prisma.refreshToken.updateMany({
      where: { userId: user?.id },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    const res = await refresh(refreshCookie, csrfCookie, csrfCookie);
    expect(res.status).toBe(401);
  });
});
