import { Router } from 'express';
import { healthRouter } from './health.router.js';

const router = Router();

router.use(healthRouter);

export { router };
