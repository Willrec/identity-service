import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';

const isDev = env.NODE_ENV === 'development';

export const prisma = new PrismaClient({
  log: isDev
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
