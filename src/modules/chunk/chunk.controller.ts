import { Request, Response, NextFunction } from "express";
import { chunkService } from "./chunk.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const chunkController = {
  async getChunksByBook(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const chunks = await chunkService.getChunksByBook(
        req.params.bookId as string,
        req.user.userId,
      );
      return ApiResponse.success(res, chunks, "Chunks retrieved successfully");
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

  async getChunksByPage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const pageNumber = parseInt(req.params.page as string, 10);
      if (isNaN(pageNumber) || pageNumber < 1) {
        return ApiResponse.error(
          res,
          "Invalid page number",
          StatusCodes.BAD_REQUEST,
        );
      }
      const chunks = await chunkService.getChunksByPage(
        req.params.bookId as string,
        pageNumber,
        req.user.userId as string,
      );
      return ApiResponse.success(
        res,
        chunks,
        "Page chunks retrieved successfully",
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
