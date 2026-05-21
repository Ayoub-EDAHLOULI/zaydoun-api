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
};
