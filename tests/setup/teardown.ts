import { prisma } from '../../src/infrastructure/database/prisma.js';

export async function teardown() {
  // Disconnect prisma at the end of the global test run
  await prisma.$disconnect();
}
