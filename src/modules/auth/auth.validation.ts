import { z } from "zod";

export const authValidation = {
  login: z.object({
    body: z.object({
      email: z.string().email("Invalid email format").toLowerCase().trim(),
      name: z.string().min(2, "Name must be at least 2 characters").trim(),
    }),
  }),

  updateProfile: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .trim()
        .optional(),
    }),
  }),
};
