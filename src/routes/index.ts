import { Router, type IRouter } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from '../modules/auth/routes/auth.router.js';

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth', authRouter);

export { router };
