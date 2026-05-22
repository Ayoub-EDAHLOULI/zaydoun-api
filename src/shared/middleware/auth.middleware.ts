import { Request, Response, NextFunction } from "express";
import { jwtUtils, JwtPayload } from "../utils/jwt";
import { AppError } from "../utils/errors";
import { StatusCodes } from "../constants/status-codes";
import { prisma } from "../../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Access token is missing or invalid",
        StatusCodes.UNAUTHORIZED,
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwtUtils.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      throw new AppError("User no longer exists", StatusCodes.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError("Account is deactivated", StatusCodes.FORBIDDEN);
    }

    req.user = { userId: user.id, email: user.email, role: user.role };

    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(
      new AppError("Invalid or expired token", StatusCodes.UNAUTHORIZED),
    );
  }
};

// Route-level role guard — use after `authenticate`
// e.g. router.get("/admin/stats", authenticate, requireRole("ADMIN"), handler)
export const requireRole =
  (...roles: Array<"USER" | "ADMIN">) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", StatusCodes.FORBIDDEN));
    }
    next();
  };
