import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  ConversationSummary,
  ConversationDetail,
  CreateConversationDto,
  AddMessageDto,
  MessageData,
} from "./conversation.types";

const messageSelect = {
  id: true,
  conversationId: true,
  role: true,
  content: true,
  sourcePage: true,
  audioPath: true,
  createdAt: true,
};

export const conversationService = {
  async listConversations(
    userId: string,
    bookId?: string,
  ): Promise<ConversationSummary[]> {
    const conversations = await prisma.conversation.findMany({
      where: { userId, ...(bookId && { bookId }) },
      select: {
        id: true,
        bookId: true,
        title: true,
        languageCode: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          select: messageSelect,
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return conversations.map(({ messages, ...rest }) => ({
      ...rest,
      lastMessage: messages[0] ?? null,
    }));
  },

  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDetail> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        userId: true,
        bookId: true,
        title: true,
        languageCode: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          select: messageSelect,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);
    if (conversation.userId !== userId)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);

    const { userId: _uid, ...rest } = conversation;
    return rest;
  },

  async createConversation(
    userId: string,
    data: CreateConversationDto,
  ): Promise<ConversationDetail> {
    const book = await prisma.book.findUnique({ where: { id: data.bookId } });
    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.userId !== userId)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.status !== "READY") {
      throw new AppError(
        "Book is not ready for conversation yet",
        StatusCodes.BAD_REQUEST,
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        bookId: data.bookId,
        languageCode: data.languageCode ?? "en",
      },
      select: {
        id: true,
        bookId: true,
        title: true,
        languageCode: true,
        createdAt: true,
        updatedAt: true,
        messages: { select: messageSelect },
      },
    });

    return conversation;
  },

  async addMessage(
    conversationId: string,
    userId: string,
    data: AddMessageDto,
  ): Promise<MessageData> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);
    if (conversation.userId !== userId)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);

    const message = await prisma.message.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content,
        sourcePage: data.sourcePage,
        audioPath: data.audioPath,
        inputTokens: data.inputTokens ?? 0,
        outputTokens: data.outputTokens ?? 0,
        audioSeconds: data.audioSeconds ?? 0,
      },
      select: messageSelect,
    });

    // Auto-generate title from the first user message
    if (!conversation.title && data.role === "user") {
      const title = data.content.slice(0, 80).trim();
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }

    return message;
  },

  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);
    if (conversation.userId !== userId)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);

    await prisma.conversation.delete({ where: { id: conversationId } });
  },
};
