import { beforeAll } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma.js';

beforeAll(async () => {
  // Wait for the DB connection or execute pre-flight checks if necessary
  // Prisma establishes connection automatically on first query, but we can enforce it.
  await prisma.$connect();
});
