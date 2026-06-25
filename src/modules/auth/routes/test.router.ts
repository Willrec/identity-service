import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';

const router = Router();

// Test-only route to validate RBAC middleware behavior
router.get('/test-rbac', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => {
  res.status(200).json({ success: true, message: 'Access granted' });
});

export { router as testRouter };
