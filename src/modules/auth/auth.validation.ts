import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain uppercase, lowercase, and a number",
  );

export const authValidation = {
  register: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100)
        .trim(),
      email: z.email("Invalid email format").toLowerCase().trim(),
      password: passwordSchema,
    }),
  }),

  login: z.object({
    body: z.object({
      email: z.email("Invalid email format").toLowerCase().trim(),
      password: z.string().min(1, "Password is required"),
    }),
  }),

  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
    }),
  }),

  updateProfile: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100)
        .trim()
        .optional(),
    }),
  }),

  forgotPassword: z.object({
    body: z.object({
      email: z.email("Invalid email format").toLowerCase().trim(),
    }),
  }),

  resetPassword: z.object({
    body: z.object({
      token: z.string().min(1, "Token is required"),
      newPassword: passwordSchema,
    }),
  }),
};
