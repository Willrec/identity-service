import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/test', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => {
  res.json({ success: true });
});

export { router as adminRouter };
