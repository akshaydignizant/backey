import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware';
import roleRestriction from '../../middleware/roleRestriction';
import { getLowStockReport, getProductPerformanceReport } from '../../controllers/reports/product.controller';
import { Role } from '@prisma/client';
import { generateCategoryPerformanceReport } from '../../controllers/report.controller';
import { Request, Response, NextFunction } from 'express';


const router = Router()

router.get(
  '/:workspaceId/reports/product-performance',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getProductPerformanceReport
);

router.get(
  '/:workspaceId/reports/low-stock',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  getLowStockReport
);

router.get(
  '/:workspaceId/reports/category-performance',
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    const workspaceId = parseInt(req.params.workspaceId);
    const filters = req.query;
    generateCategoryPerformanceReport({ workspaceId, filters })
      .then((data) => res.json(data))
      .catch(next);
  }
);
export default router