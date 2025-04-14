import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types/types';
import httpResponse from '../util/httpResponse';


const roleRestriction = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role; // Access the role from the user object

    // Check if the role exists and if it's one of the allowed roles
    if (!userRole || !allowedRoles.includes(userRole)) {
      httpResponse(req, res, 403, 'Access Denied: You do not have the required permissions.');
    }
    next();
  };
};

export default roleRestriction;
