import { Router } from 'express'


const router = Router()
import { authMiddleware } from '../../middleware/auth.middleware';
import roleRestriction from '../../middleware/roleRestriction';
import { Role } from '@prisma/client';
import { generateWorkspaceActivityReport, getOrderFulfillmentReport, getShippingReport } from '../../controllers/reports/operational.controller';
router.get(
  '/:workspaceId/reports/order-fulfillment',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getOrderFulfillmentReport
);

router.get(
  '/:workspaceId/reports/shipping',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getShippingReport
);

router.get(
  '/:workspaceId/reports/workspace-activity',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  (req, res, next) => {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const filters = req.query;
    generateWorkspaceActivityReport({ workspaceId, filters })
      .then((data) => res.json(data))
      .catch(next);
  }
);
export default router