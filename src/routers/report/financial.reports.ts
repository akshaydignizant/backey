import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware';
import roleRestriction from '../../middleware/roleRestriction';
import { Role } from '@prisma/client';
import { generateTaxReport, getFinancialSummaryReport, getPaymentMethodReport } from '../../controllers/reports/financial.controller';

const router = Router()
router.get(
  '/:workspaceId/reports/financial-summary',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getFinancialSummaryReport
);

router.get(
  '/:workspaceId/reports/payment-methods',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getPaymentMethodReport
);

router.get(
  '/:workspaceId/reports/taxes',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  (req, res, next) => {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const filters = req.query;
    generateTaxReport({ workspaceId, filters })
      .then((result) => res.json(result))
      .catch(next);
  }
);

export default router