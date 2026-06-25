import { describe, it, expect, afterEach } from 'vitest';
import { cleanupData, createVerifiedUser, createUnverifiedUser, createSuspendedUser, createDeletedUser, login } from '../setup/helpers.js';

describe('POST /api/v1/auth/login', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('logs in with valid credentials', async () => {
    const { payload } = await createVerifiedUser();
    
    const { res, refreshCookie, csrfCookie } = await login(payload.email, payload.password);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeUndefined(); // Security: Should not be in JSON
    expect(refreshCookie).toBeTruthy();
    expect(csrfCookie).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const { payload } = await createVerifiedUser();
    
    const { res } = await login(payload.email, 'WrongPassword123');
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const { res } = await login('nobody@example.com', 'SomePassword123!');
    expect(res.status).toBe(401);
  });

  it('rejects unverified email', async () => {
    const { payload } = await createUnverifiedUser();
    
    const { res } = await login(payload.email, payload.password);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('rejects suspended user', async () => {
    const { payload } = await createSuspendedUser();
    
    const { res } = await login(payload.email, payload.password);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('rejects deleted user', async () => {
    const { payload } = await createDeletedUser();
    
    const { res } = await login(payload.email, payload.password);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DELETED');
  });
});
