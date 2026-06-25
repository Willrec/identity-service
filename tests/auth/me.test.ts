import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma.js';
import { request } from '../setup/test-app.js';
import { cleanupData, authenticateClient } from '../setup/helpers.js';

describe('GET /api/v1/auth/me', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('returns profile for authenticated user', async () => {
    const { accessToken, userPayload } = await authenticateClient();
    
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(userPayload.email.toLowerCase());
  });

  it('rejects missing JWT', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid JWT', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer invalid.token.here`);
      
    expect(res.status).toBe(401);
  });

  it('rejects suspended user', async () => {
    const { accessToken, userPayload } = await authenticateClient();
    
    // Suspend user manually
    await prisma.user.update({
      where: { email: userPayload.email },
      data: { status: 'SUSPENDED' }
    });
    
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
      
    // The authenticate middleware checks user status and throws Forbidden
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('rejects deleted user', async () => {
    const { accessToken, userPayload } = await authenticateClient();
    
    await prisma.user.update({
      where: { email: userPayload.email },
      data: { status: 'DELETED' }
    });
    
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DELETED');
  });
});
