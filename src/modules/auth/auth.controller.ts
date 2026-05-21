import { Request, Response } from "express";
import { authService } from "./auth.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { catchAsync } from "../../shared/utils/catchAsync";

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
  register: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.cookie("refreshToken", result.accessToken, getCookieOptions(req));
    return ApiResponse.success(
      res,
      result,
      "Registration successful",
      StatusCodes.CREATED,
    );
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    res.cookie("refreshToken", result.accessToken, getCookieOptions(req));
    return ApiResponse.success(res, result, "Login successful");
  }),

  refreshToken: catchAsync(async (req: Request, res: Response) => {
    const cookieOptions = getCookieOptions(req);
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return ApiResponse.error(
        res,
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
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) await authService.logout(refreshToken);
    const cookieOptions = getCookieOptions(req);
    res.cookie("refreshToken", "", { ...cookieOptions, maxAge: 0 });
    return ApiResponse.success(res, null, "Logout successful");
  }),

  getProfile: catchAsync(async (req: Request, res: Response) => {
    const profile = await authService.getProfile(req.user!.userId);
    return ApiResponse.success(res, profile, "Profile retrieved successfully");
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const updatedUser = await authService.updateProfile(
      req.user!.userId,
      req.body,
    );
    return ApiResponse.success(
      res,
      updatedUser,
      "Profile updated successfully",
    );
  }),

  changePassword: catchAsync(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.userId, req.body);
    return ApiResponse.success(res, null, "Password changed successfully");
  }),
};
