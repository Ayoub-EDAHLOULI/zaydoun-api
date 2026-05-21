import { Request, Response } from "express";
import { bookService } from "./book.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { catchAsync } from "../../shared/utils/catchAsync";

export const bookController = {
  listBooks: catchAsync(async (req: Request, res: Response) => {
    const books = await bookService.listBooks(req.user!.userId);
    return ApiResponse.success(res, books, "Books retrieved successfully");
  }),

  getBook: catchAsync(async (req: Request, res: Response) => {
    const book = await bookService.getBook(
      req.params.id as string,
      req.user!.userId,
    );
    return ApiResponse.success(res, book, "Book retrieved successfully");
  }),

  uploadBook: catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
      return ApiResponse.error(
        res,
        "PDF file is required",
        StatusCodes.BAD_REQUEST,
      );
    }
    const book = await bookService.uploadBook(
      req.user!.userId,
      req.file,
      req.body,
    );
    return ApiResponse.success(
      res,
      book,
      "Book uploaded successfully",
      StatusCodes.CREATED,
    );
  }),

  deleteBook: catchAsync(async (req: Request, res: Response) => {
    await bookService.deleteBook(req.params.id as string, req.user!.userId);
    return ApiResponse.success(res, null, "Book deleted successfully");
  }),
};
