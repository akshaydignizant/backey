// import { Request, Response, NextFunction } from 'express';
// import { Role } from '@prisma/client';
// import { AuthRequest } from '../types/types';
// import httpResponse from '../util/httpResponse';


// const roleRestriction = (allowedRoles: Role[]) => {
//   return (req: AuthRequest, res: Response, next: NextFunction): void => {
//     const userRole = req.user?.role; // Access the role from the user object

//     // Check if the role exists and if it's one of the allowed roles
//     if (!userRole || !allowedRoles.includes(userRole)) {
//       httpResponse(req, res, 403, 'Access Denied: You do not have the required permissions.');
//     }
//     next();
//   };
// };

// export default roleRestriction;

// src/middlewares/roleRestriction.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types/types'; // assuming you have a custom type with user info
import httpResponse from '../util/httpResponse'; // your utility to send responses

const roleRestriction = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user || !user.roles || user.roles.length === 0) {
      return httpResponse(req, res, 403, 'Access Denied: No roles assigned');
    }

    // If user is admin in any workspace, allow
    const isAdmin = user.roles.some((roleObj: { role: Role; workspaceId: number }) =>
      roleObj.role === Role.ADMIN
    );
    if (isAdmin) {
      return next();
    }

    // Otherwise, check for allowed roles in the current workspace
    const currentWorkspaceId = req.params.workspaceId
      ? parseInt(req.params.workspaceId)
      : user.workspaceId; // fallback if not in params

    const hasAllowedRole = user.roles.some((roleObj: { role: Role; workspaceId: number }) =>
      allowedRoles.includes(roleObj.role) &&
      roleObj.workspaceId === currentWorkspaceId
    );

    if (!hasAllowedRole) {
      return httpResponse(
        req,
        res,
        403,
        'Access Denied: You do not have the required permissions'
      );
    }

    next();
  };
};

export default roleRestriction;
