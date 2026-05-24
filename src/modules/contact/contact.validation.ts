import { z } from "zod";

export const contactValidation = {
  submit: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100)
        .trim(),
      email: z.email("Invalid email format").toLowerCase().trim(),
      topic: z.string().min(1, "Topic is required").max(100).trim(),
      message: z
        .string()
        .min(10, "Message must be at least 10 characters")
        .max(5000)
        .trim(),
      captchaToken: z.string().min(1, "Captcha token is required"),
    }),
  }),
};
