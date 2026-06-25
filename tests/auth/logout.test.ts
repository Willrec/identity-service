import { describe, it, expect, afterEach } from 'vitest';
import { cleanupData, authenticateClient, logout, refresh } from '../setup/helpers.js';

describe('POST /api/v1/auth/logout', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('logs out successfully and clears cookies', async () => {
    const { refreshCookie, csrfCookie } = await authenticateClient();
    
    const res = await logout(refreshCookie, csrfCookie, csrfCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const setCookie = res.headers['set-cookie'];
    // We expect both __Host-refresh and csrfToken to have Expires= in the past
    const hasRefreshClear = setCookie.some((c: string) => c.includes('__Host-refresh=') && c.includes('Expires='));
    const hasCsrfClear = setCookie.some((c: string) => c.includes('csrfToken=') && c.includes('Expires='));
    
    expect(hasRefreshClear).toBe(true);
    expect(hasCsrfClear).toBe(true);
  });

  it('is idempotent (succeeds even if already logged out)', async () => {
    const { refreshCookie, csrfCookie } = await authenticateClient();
    
    await logout(refreshCookie, csrfCookie, csrfCookie);
    const res2 = await logout(refreshCookie, csrfCookie, csrfCookie);
    
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
  });

  it('causes subsequent refresh to fail', async () => {
    const { refreshCookie, csrfCookie } = await authenticateClient();
    
    await logout(refreshCookie, csrfCookie, csrfCookie);
    const res = await refresh(refreshCookie, csrfCookie, csrfCookie);
    
    expect(res.status).toBe(401);
  });
});
