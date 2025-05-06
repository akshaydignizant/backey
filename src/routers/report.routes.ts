import { Router } from 'express';
import { Role } from '@prisma/client';

import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import customRoutes from './report/customDateRangeReports';
import financialRoutes from './report/financial.reports';
import operationalRoutes from './report/operationalReports';
import productRoutes from './report/productPerformanceReports';
import userRoutes from './report/userOrStaffReports';
import customerRoutes from './report/customerBehaviorReports';
import {
    getSalesReport,
    getInventoryReport,
    getCustomerReport,
    getEmployeePerformanceReport,
} from '../controllers/reports';

const router = Router();

/**
 * Reporting Routes
 */
router.get(
    '/:workspaceId/reports/sales',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER]),
    getSalesReport
);

router.get(
    '/:workspaceId/reports/inventory',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER]),
    getInventoryReport
);

router.get(
    '/:workspaceId/reports/customer',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER]),
    getCustomerReport
);

router.get(
    '/:workspaceId/reports/employee-performance',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER]),
    getEmployeePerformanceReport
);

router.use('/custom', customRoutes);
router.use('/customer', customerRoutes);
router.use('/financial', financialRoutes);
router.use('/operational', operationalRoutes);
router.use('/product', productRoutes);
router.use('/user', userRoutes);

export default router;
