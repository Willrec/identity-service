import { Router, type IRouter } from 'express';
import { prisma } from '../infrastructure/database/prisma.js';

const router: IRouter = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      },
    });
  } catch {
    next({
      success: true,
      data: {
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      },
    });
  }
});

export { router as healthRouter };
