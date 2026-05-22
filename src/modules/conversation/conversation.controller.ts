import { Request, Response } from "express";
import { conversationService } from "./conversation.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { catchAsync } from "../../shared/utils/catchAsync";
import { chatService } from "../chat/chat.service";
import { AppError } from "../../shared/utils/errors";

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

  talkToZaydoun: catchAsync(async (req: Request, res: Response) => {
    if (!req.file)
      throw new AppError("Audio file required", StatusCodes.BAD_REQUEST);

    const result = await chatService.processVoiceMessage(
      req.params.id as string,
      req.user!.userId,
      req.file.path,
      req.body.languageCode as string | undefined,
    );

    return ApiResponse.success(res, result, "Zaydoun responded");
  }),

  chatWithZaydoun: catchAsync(async (req: Request, res: Response) => {
    const { message, languageCode } = req.body;
    if (!message || typeof message !== "string" || !message.trim())
      throw new AppError("message is required", StatusCodes.BAD_REQUEST);

    const result = await chatService.processTextMessage(
      req.params.id as string,
      req.user!.userId,
      message.trim(),
      languageCode as string | undefined,
    );

    return ApiResponse.success(res, result, "Zaydoun responded");
  }),

  deleteConversation: catchAsync(async (req: Request, res: Response) => {
    await conversationService.deleteConversation(
      req.params.id as string,
      req.user!.userId,
    );
    return ApiResponse.success(res, null, "Conversation deleted successfully");
  }),
};
