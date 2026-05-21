import { Request, Response } from "express";
import { conversationService } from "./conversation.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { catchAsync } from "../../shared/utils/catchAsync";

export const conversationController = {
  listConversations: catchAsync(async (req: Request, res: Response) => {
    const bookId = req.query.bookId as string | undefined;
    const conversations = await conversationService.listConversations(
      req.user!.userId,
      bookId,
    );
    return ApiResponse.success(
      res,
      conversations,
      "Conversations retrieved successfully",
    );
  }),

  getConversation: catchAsync(async (req: Request, res: Response) => {
    const conversation = await conversationService.getConversation(
      req.params.id as string,
      req.user!.userId,
    );
    return ApiResponse.success(
      res,
      conversation,
      "Conversation retrieved successfully",
    );
  }),

  createConversation: catchAsync(async (req: Request, res: Response) => {
    const conversation = await conversationService.createConversation(
      req.user!.userId,
      req.body,
    );
    return ApiResponse.success(
      res,
      conversation,
      "Conversation created successfully",
      StatusCodes.CREATED,
    );
  }),

  addMessage: catchAsync(async (req: Request, res: Response) => {
    const message = await conversationService.addMessage(
      req.params.id as string,
      req.user!.userId,
      req.body,
    );
    return ApiResponse.success(
      res,
      message,
      "Message added successfully",
      StatusCodes.CREATED,
    );
  }),

  deleteConversation: catchAsync(async (req: Request, res: Response) => {
    await conversationService.deleteConversation(
      req.params.id as string,
      req.user!.userId,
    );
    return ApiResponse.success(res, null, "Conversation deleted successfully");
  }),
};
