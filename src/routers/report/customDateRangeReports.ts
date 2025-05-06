import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware';
import roleRestriction from '../../middleware/roleRestriction';
import { Role } from '@prisma/client';
import { generateCustomSalesReport } from '../../controllers/reports/customer.controller';
import { generateCustomProductReport } from '../../controllers/reports/export.controller';

const router = Router()

router.get(
  '/:workspaceId/reports/custom-sales',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  (req, res, next) => {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const filters = req.query;
    generateCustomSalesReport({ workspaceId, filters })
      .then((data) => res.json(data))
      .catch(next);
  }
);

router.get(
  '/:workspaceId/reports/custom-product',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  (req, res, next) => {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const filters = req.query;
    generateCustomProductReport({ workspaceId, filters })
      .then((data) => res.json(data))
      .catch(next);
  }
);
export default router