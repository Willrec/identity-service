import { describe, it, expect, afterEach } from 'vitest';
import { cleanupData, createVerifiedUser, createUnverifiedUser, forgotPassword } from '../setup/helpers.js';

describe('POST /api/v1/auth/forgot-password', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('accepts existing verified email', async () => {
    const { payload } = await createVerifiedUser();
    
    const res = await forgotPassword(payload.email);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 for unknown email to prevent enumeration', async () => {
    const res = await forgotPassword('nobody@example.com');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 for unverified account to prevent enumeration', async () => {
    const { payload } = await createUnverifiedUser();
    
    const res = await forgotPassword(payload.email);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
