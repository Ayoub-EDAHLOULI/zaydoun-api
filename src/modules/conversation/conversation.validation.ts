import { z } from "zod";

export const conversationValidation = {
  createConversation: z.object({
    body: z.object({
      bookId: z.uuid("Invalid book ID"),
      languageCode: z.string().length(2).toLowerCase().default("en"),
    }),
  }),

  conversationId: z.object({
    params: z.object({
      id: z.uuid("Invalid conversation ID"),
    }),
  }),

  addMessage: z.object({
    params: z.object({
      id: z.uuid("Invalid conversation ID"),
    }),
    body: z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1, "Content is required"),
      sourcePage: z.number().int().positive().optional(),
      audioPath: z.string().optional(),
    }),
  }),

  chatMessage: z.object({
    params: z.object({
      id: z.uuid("Invalid conversation ID"),
    }),
    body: z.object({
      message: z.string().min(1, "Message is required").max(2000),
      languageCode: z.string().length(2).toLowerCase().optional(),
    }),
  }),
};
