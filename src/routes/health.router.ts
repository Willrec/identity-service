import { Router, type IRouter } from 'express';
import { prisma } from '../infrastructure/database/prisma.js';
import { UserRepository } from '../modules/users/repositories/user.repository.js';
import { UserService } from '../modules/users/services/user.service.js';

const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);

const router: IRouter = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const usersCount = await userService.countUsers();

    res.json({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        usersCount,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as healthRouter };
