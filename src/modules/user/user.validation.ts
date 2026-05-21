import { z } from "zod";

export const userValidation = {
  updateUser: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100)
        .trim()
        .optional(),
      email: z.email("Invalid email format").toLowerCase().trim().optional(),
    }),
  }),

  userId: z.object({
    params: z.object({
      id: z.uuid("Invalid user ID"),
    }),
  }),
};
