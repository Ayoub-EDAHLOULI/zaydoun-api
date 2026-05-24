import { Request, Response } from "express";
import https from "https";
import { contactService } from "./contact.service";
import { ApiResponse } from "../../shared/utils/response";
import { AppError } from "../../shared/utils/errors";
import { catchAsync } from "../../shared/utils/catchAsync";

function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY ?? "";
  const body = `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.google.com",
        path: "/recaptcha/api/siteverify",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw).success === true);
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export const contactController = {
  submit: catchAsync(async (req: Request, res: Response) => {
    const { captchaToken, ...formData } = req.body;
    const valid = await verifyRecaptcha(captchaToken);
    if (!valid) throw new AppError("Captcha verification failed.", 400);
    await contactService.submit(formData);
    return ApiResponse.success(
      res,
      null,
      "Message received — we'll be in touch soon.",
    );
  }),
};
