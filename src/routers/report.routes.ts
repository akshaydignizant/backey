import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';
import {
    getSalesReport,
    getInventoryReport,
    getCustomerReport,
    getEmployeePerformanceReport,
} from '../controllers/report.controller';

const router = Router();

// Reporting Routes
router.get('/:workspaceId/reports/sales', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), getSalesReport);
router.get('/:workspaceId/reports/inventory', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), getInventoryReport);
router.get('/:workspaceId/reports/customer', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), getCustomerReport);
router.get('/:workspaceId/reports/employee-performance', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), getEmployeePerformanceReport);

export default router;