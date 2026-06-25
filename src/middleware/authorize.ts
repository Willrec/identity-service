import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../shared/errors/HttpError.js';
import { prisma } from '../infrastructure/database/prisma.js';

export const authorize = (...roles: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw HttpError.Unauthorized('Not authenticated');
      }

      const userId = req.user.id;

      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      });

      if (roles.length > 0) {
        const hasRequiredRole = userRoles.some((ur) => roles.includes(ur.role.name));

        if (!hasRequiredRole) {
          throw HttpError.Forbidden('Insufficient permissions');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
