import http from 'http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prisma.js';
import { logger } from './shared/logger.js';

const app = createApp();
const httpServer = http.createServer(app);

async function start(): Promise<void> {
  try {
    await connectDatabase();
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    process.exit(1);
  }

  httpServer.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `elevo-auth-api running`,
    );
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  httpServer.close(async () => {
    try {
      await disconnectDatabase();
    } catch (err) {
      logger.error({ err }, 'Error during database disconnect');
    } finally {
      logger.info('Server stopped cleanly');
      process.exit(0);
    }
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});

void start();
