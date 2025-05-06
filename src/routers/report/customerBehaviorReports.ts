import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware';
import roleRestriction from '../../middleware/roleRestriction';
import { Role } from '@prisma/client';
import { generateCustomerLoyaltyReport, getAbandonedCartsReport, getCustomerActivityReport } from '../../controllers/reports/customer.controller';

const router = Router()
router.get(
  '/:workspaceId/reports/customer-activity',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getCustomerActivityReport
);

router.get(
  '/:workspaceId/reports/customer-loyalty',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  async (req, res, next) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId, 10);
      const filters = req.query;
      const result = await generateCustomerLoyaltyReport({ workspaceId, filters });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:workspaceId/reports/abandoned-carts',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getAbandonedCartsReport
);

export default router