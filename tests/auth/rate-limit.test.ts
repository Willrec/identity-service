import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear module cache to ensure env and middlewares are re-evaluated
    vi.resetModules();
  });

  it('blocks requests after hitting the configured limit', async () => {
    // Override the environment limit strictly for this test instance
    process.env.RATE_LIMIT_LOGIN = '5';
    
    // Dynamically import the app factory so it picks up the new env variables
    const { createApp } = await import('../../src/app.js');
    const app = createApp();
    const request = supertest(app);
    
    // Fire 5 requests (the limit)
    for (let i = 0; i < 5; i++) {
      const res = await request.post('/api/v1/auth/login').send({});
      // With empty payload, Zod throws 400 Bad Request, but it's ALLOWED by rate limit
      expect(res.status).toBe(400); 
    }
    
    // The 6th request should be blocked
    const res = await request.post('/api/v1/auth/login').send({});
    expect(res.status).toBe(429);
    expect(res.body.error.message).toMatch(/too many login attempts/i);
    
    // Restore the high limit for other tests (though vitest isolates env vars anyway)
    process.env.RATE_LIMIT_LOGIN = '1000';
  });
});
