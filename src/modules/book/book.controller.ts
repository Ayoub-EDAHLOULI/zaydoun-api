import { Request, Response, NextFunction } from "express";
import { bookService } from "./book.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const bookController = {
  async listBooks(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const books = await bookService.listBooks(req.user.userId);
      return ApiResponse.success(res, books, "Books retrieved successfully");
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

  async getBook(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const book = await bookService.getBook(
        req.params.id as string,
        req.user.userId,
      );
      return ApiResponse.success(res, book, "Book retrieved successfully");
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

  async uploadBook(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      if (!req.file)
        return ApiResponse.error(
          res,
          "PDF file is required",
          StatusCodes.BAD_REQUEST,
        );

      const book = await bookService.uploadBook(
        req.user.userId,
        req.file,
        req.body,
      );
      return ApiResponse.success(
        res,
        book,
        "Book uploaded successfully",
        StatusCodes.CREATED,
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

  async deleteBook(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      await bookService.deleteBook(req.params.id as string, req.user.userId);
      return ApiResponse.success(res, null, "Book deleted successfully");
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
