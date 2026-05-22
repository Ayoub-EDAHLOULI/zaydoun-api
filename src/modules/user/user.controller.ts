import { Request, Response } from "express";
import { userService } from "./user.service";
import { ApiResponse } from "../../shared/utils/response";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";

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
      return ApiResponse.error(
        res,
        "Invalid period. Use: day, week, month, all",
        400,
      );
    }
    const stats = await userService.getUsageStats(
      req.user!.userId,
      period as "day" | "week" | "month" | "all",
    );
    return ApiResponse.success(
      res,
      stats,
      "Usage stats retrieved successfully",
    );
  }),

  // ── Admin handlers ──────────────────────────────────────────────────────

  listUsers: catchAsync(async (_req: Request, res: Response) => {
    const users = await userService.listAllUsers();
    return ApiResponse.success(res, users, "Users retrieved successfully");
  }),

  updateRole: catchAsync(async (req: Request, res: Response) => {
    const { role } = req.body;
    if (role !== "USER" && role !== "ADMIN")
      throw new AppError("role must be USER or ADMIN", StatusCodes.BAD_REQUEST);

    // Prevent admin from demoting themselves
    if (req.params.id === req.user!.userId && role === "USER")
      throw new AppError(
        "Cannot demote your own account",
        StatusCodes.BAD_REQUEST,
      );

    await userService.updateUserRole(req.params.id as string, role);
    return ApiResponse.success(res, null, "Role updated successfully");
  }),

  adminDeleteUser: catchAsync(async (req: Request, res: Response) => {
    if (req.params.id === req.user!.userId)
      throw new AppError(
        "Cannot delete your own account",
        StatusCodes.BAD_REQUEST,
      );

    await userService.adminDeleteUser(req.params.id as string);
    return ApiResponse.success(res, null, "User deleted successfully");
  }),
};
