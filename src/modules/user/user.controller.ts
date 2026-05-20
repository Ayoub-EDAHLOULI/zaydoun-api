import { Request, Response, NextFunction } from "express";
import { userService } from "./user.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const userController = {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const user = await userService.getUser(req.user.userId);
      return ApiResponse.success(res, user, "User retrieved successfully");
    } catch (error) {
      if (error instanceof AppError)
        return ApiResponse.error(res, error.message, error.statusCode);
      return ApiResponse.error(
        res,
        "Internal Server Error",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const user = await userService.updateUser(req.user.userId, req.body);
      return ApiResponse.success(res, user, "User updated successfully");
    } catch (error) {
      if (error instanceof AppError)
        return ApiResponse.error(res, error.message, error.statusCode);
      return ApiResponse.error(
        res,
        "Internal Server Error",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  async deleteMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      await userService.deleteUser(req.user.userId);
      return ApiResponse.success(res, null, "Account deleted successfully");
    } catch (error) {
      if (error instanceof AppError)
        return ApiResponse.error(res, error.message, error.statusCode);
      return ApiResponse.error(
        res,
        "Internal Server Error",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
};
