import { Request, Response } from "express";
import { userService } from "./user.service";
import { ApiResponse } from "../../shared/utils/response";
import { catchAsync } from "../../shared/utils/catchAsync";

export const userController = {
  getMe: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.getUser(req.user!.userId);
    return ApiResponse.success(res, user, "User retrieved successfully");
  }),

  updateMe: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.user!.userId, req.body);
    return ApiResponse.success(res, user, "User updated successfully");
  }),

  deleteMe: catchAsync(async (req: Request, res: Response) => {
    await userService.deleteUser(req.user!.userId);
    return ApiResponse.success(res, null, "Account deleted successfully");
  }),

  getStats: catchAsync(async (req: Request, res: Response) => {
    const period = (req.query.period as string) ?? "week";
    if (!["day", "week", "month", "all"].includes(period)) {
      return ApiResponse.error(res, "Invalid period. Use: day, week, month, all", 400);
    }
    const stats = await userService.getUsageStats(
      req.user!.userId,
      period as "day" | "week" | "month" | "all",
    );
    return ApiResponse.success(res, stats, "Usage stats retrieved successfully");
  }),
};
