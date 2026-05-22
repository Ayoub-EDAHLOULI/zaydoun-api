import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../utils/errors";
import { StatusCodes } from "../constants/status-codes";

const MAX_BOOKS = parseInt(process.env.TIER_MAX_BOOKS ?? "2");
const MAX_MESSAGES_PER_DAY = parseInt(
  process.env.TIER_MAX_MESSAGES_PER_DAY ?? "15",
);

// Block book upload when user already owns MAX_BOOKS books.
// ADMINs are exempt — they manage the platform and have no wallet impact.
export const enforceBooksLimit = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user!.role === "ADMIN") return next();

    const count = await prisma.book.count({
      where: { userId: req.user!.userId },
    });

    if (count >= MAX_BOOKS) {
      return next(
        new AppError(
          `Book limit reached. Free accounts can upload up to ${MAX_BOOKS} book${MAX_BOOKS !== 1 ? "s" : ""}.`,
          StatusCodes.FORBIDDEN,
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Block a chat/voice turn when the user has already sent MAX_MESSAGES_PER_DAY
// user-role messages today (UTC day boundary).
// Voice commands that return early (no AI call) are counted the same way —
// they still reach this middleware before the route handler.
// ADMINs are exempt.
export const enforceMessagesLimit = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user!.role === "ADMIN") return next();

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const count = await prisma.message.count({
      where: {
        role: "user",
        createdAt: { gte: startOfDay },
        conversation: { userId: req.user!.userId },
      },
    });

    if (count >= MAX_MESSAGES_PER_DAY) {
      return next(
        new AppError(
          `Daily message limit reached. Free accounts can send up to ${MAX_MESSAGES_PER_DAY} messages per day. Resets at midnight UTC.`,
          StatusCodes.FORBIDDEN,
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
