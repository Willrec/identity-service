import { Router, type IRouter } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from '../modules/auth/routes/auth.router.js';
import { oauthRouter } from '../modules/oauth/index.js';
import { adminRouter } from './admin.router.js';
import { userRouter } from './user.router.js';

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/auth/oauth', oauthRouter);
router.use('/admin', adminRouter);
router.use('/user', userRouter);

export { router };
