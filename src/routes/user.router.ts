import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router: Router = Router();

router.get('/test', authenticate, authorize('USER', 'ADMIN', 'SUPER_ADMIN'), (_req, res) => {
  res.json({ success: true });
});

export { router as userRouter };
