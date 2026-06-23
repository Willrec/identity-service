import { Router, type IRouter } from 'express';
import { healthRouter } from './health.router.js';

const router: IRouter = Router();

router.use(healthRouter);

export { router };
