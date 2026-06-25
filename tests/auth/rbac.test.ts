import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { request } from '../setup/test-app.js';
import { cleanupData, authenticateClient, createAdminUser, createSuperAdminUser, login } from '../setup/helpers.js';

// We'll create a dummy route just for RBAC testing on the same Express app instance.
// But since the app is exported from test-app.js as a supertest agent, 
// we can also test it by extracting the underlying app.
// Actually, request.app is the Express instance!
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';

describe('RBAC Middleware', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('rejects unauthenticated users (401)', async () => {
    const res = await request.get('/api/v1/test-rbac');
    expect(res.status).toBe(401);
  });

  it('rejects standard users (403)', async () => {
    const { accessToken } = await authenticateClient();
    
    const res = await request
      .get('/api/v1/test-rbac')
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows ADMIN users (200)', async () => {
    const { payload } = await createAdminUser();
    const loginRes = await login(payload.email, payload.password);
    const accessToken = loginRes.res.body.data.accessToken;

    const res = await request
      .get('/api/v1/test-rbac')
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows SUPER_ADMIN users (200)', async () => {
    const { payload } = await createSuperAdminUser();
    const loginRes = await login(payload.email, payload.password);
    const accessToken = loginRes.res.body.data.accessToken;

    const res = await request
      .get('/api/v1/test-rbac')
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
