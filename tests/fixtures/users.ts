import crypto from 'node:crypto';

export const generateTestUser = () => ({
  email: `test-${crypto.randomUUID()}@example.com`,
  password: 'SecurePassword123!',
  firstName: 'Test',
  lastName: 'User',
});
