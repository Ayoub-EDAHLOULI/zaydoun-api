import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

const getCookieOptions = (req: Request) => {
  const isProduction = process.env.NODE_ENV === "production";

  let domain: string | undefined;
  if (isProduction) {
    const parts = req.hostname.split(".");
    if (parts.length >= 2) domain = `.${parts.slice(-2).join(".")}`;
  }

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
    domain,
  };
};

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.cookie("refreshToken", result.accessToken, getCookieOptions(req));
      return ApiResponse.success(res, result, "Login successful");
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

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    const cookieOptions = getCookieOptions(req);
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw new AppError(
          "No refresh token provided",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const tokens = await authService.refreshToken(refreshToken);
      res.cookie("refreshToken", tokens.refreshToken, cookieOptions);

      return ApiResponse.success(
        res,
        { accessToken: tokens.accessToken },
        "Token refreshed",
      );
    } catch (error) {
      res.clearCookie("refreshToken", cookieOptions);
      if (error instanceof AppError)
        return ApiResponse.error(res, error.message, error.statusCode);
      return ApiResponse.error(
        res,
        "Internal Server Error",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) await authService.logout(refreshToken);

      const cookieOptions = getCookieOptions(req);
      res.cookie("refreshToken", "", { ...cookieOptions, maxAge: 0 });

      return ApiResponse.success(res, null, "Logout successful");
    } catch (error) {
      return ApiResponse.error(
        res,
        "Logout failed",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const profile = await authService.getProfile(req.user.userId);
      return ApiResponse.success(
        res,
        profile,
        "Profile retrieved successfully",
      );
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

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const updatedUser = await authService.updateProfile(
        req.user.userId,
        req.body,
      );
      return ApiResponse.success(
        res,
        updatedUser,
        "Profile updated successfully",
      );
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
