import { z } from "zod";

export const bookValidation = {
  createBook: z.object({
    body: z.object({
      title: z.string().min(1, "Title is required").max(255).trim(),
      author: z.string().max(255).trim().optional(),
      language: z
        .string()
        .length(2, "Language must be a 2-letter ISO code")
        .toLowerCase()
        .default("ar"),
    }),
  }),

  bookId: z.object({
    params: z.object({
      id: z.uuid("Invalid book ID"),
    }),
  }),
};
