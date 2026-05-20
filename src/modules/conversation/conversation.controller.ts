import { Request, Response, NextFunction } from "express";
import { conversationService } from "./conversation.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const conversationController = {
  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const bookId = req.query.bookId as string | undefined;
      const conversations = await conversationService.listConversations(
        req.user.userId,
        bookId,
      );
      return ApiResponse.success(
        res,
        conversations,
        "Conversations retrieved successfully",
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

  async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const conversation = await conversationService.getConversation(
        req.params.id as string,
        req.user.userId,
      );
      return ApiResponse.success(
        res,
        conversation,
        "Conversation retrieved successfully",
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

  async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const conversation = await conversationService.createConversation(
        req.user.userId,
        req.body,
      );
      return ApiResponse.success(
        res,
        conversation,
        "Conversation created successfully",
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

  async addMessage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      const message = await conversationService.addMessage(
        req.params.id as string,
        req.user.userId,
        req.body,
      );
      return ApiResponse.success(
        res,
        message,
        "Message added successfully",
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

  async deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      await conversationService.deleteConversation(
        req.params.id as string,
        req.user.userId,
      );
      return ApiResponse.success(
        res,
        null,
        "Conversation deleted successfully",
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
