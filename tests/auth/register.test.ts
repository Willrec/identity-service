import { describe, it, expect, afterEach } from 'vitest';
import { request } from '../setup/test-app.js';
import { cleanupData, createUser } from '../setup/helpers.js';
import { generateTestUser } from '../fixtures/users.js';

describe('POST /api/v1/auth/register', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('registers a valid user', async () => {
    const { res, payload } = await createUser();
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(payload.email.toLowerCase());
    expect(res.body.data.user.id).toBeDefined();
  });

  it('rejects duplicate email', async () => {
    const { payload } = await createUser();
    
    const res = await request.post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('rejects weak password', async () => {
    const payload = { ...generateTestUser(), password: '123' };
    const res = await request.post('/api/v1/auth/register').send(payload);
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid email', async () => {
    const payload = { ...generateTestUser(), email: 'not-an-email' };
    const res = await request.post('/api/v1/auth/register').send(payload);
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing fields', async () => {
    const res = await request.post('/api/v1/auth/register').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });
});
