import { z } from "zod";

export const chunkValidation = {
  bookId: z.object({
    params: z.object({
      bookId: z.string().uuid("Invalid book ID"),
    }),
  }),

  searchChunks: z.object({
    params: z.object({
      bookId: z.string().uuid("Invalid book ID"),
    }),
    body: z.object({
      query: z.string().min(1, "Query is required").max(1000),
      pageNumber: z.number().int().positive().optional(),
      topK: z.number().int().min(1).max(20).default(5),
    }),
  }),
};
