import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware';
import roleRestriction from '../../middleware/roleRestriction';
import { Role } from '@prisma/client';
import { generateStaffActivityReport, generateUserSignupsReport } from '../../controllers/reports/export.controller';

const router = Router()
router.get(
  '/:workspaceId/reports/staff-activity',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  (req, res, next) => {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const filters = req.query;
    generateStaffActivityReport({ workspaceId, filters })
      .then((data) => res.json(data))
      .catch(next);
  }
);

router.get(
  '/:workspaceId/reports/user-signups',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  (req, res, next) => {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const filters = req.query;
    generateUserSignupsReport({ workspaceId, filters })
      .then((data) => res.json(data))
      .catch(next);
  }
);

export default router