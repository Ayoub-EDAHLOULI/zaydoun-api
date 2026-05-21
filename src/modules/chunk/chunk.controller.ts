import { Request, Response } from "express";
import { chunkService } from "./chunk.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { catchAsync } from "../../shared/utils/catchAsync";

export const chunkController = {
  getChunksByBook: catchAsync(async (req: Request, res: Response) => {
    const chunks = await chunkService.getChunksByBook(
      req.params.bookId as string,
      req.user!.userId,
    );
    return ApiResponse.success(res, chunks, "Chunks retrieved successfully");
  }),

  getChunksByPage: catchAsync(async (req: Request, res: Response) => {
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
      req.user!.userId,
    );
    return ApiResponse.success(
      res,
      chunks,
      "Page chunks retrieved successfully",
    );
  }),

  searchChunks: catchAsync(async (req: Request, res: Response) => {
    const { query, pageNumber, topK } = req.body;
    const dummyEmbedding = new Array(1536).fill(0.1);

    const results = await chunkService.searchChunks(
      req.params.bookId as string,
      dummyEmbedding,
      req.user!.userId,
      pageNumber,
      topK,
    );
    return ApiResponse.success(res, results, "Chunks searched successfully");
  }),
};
