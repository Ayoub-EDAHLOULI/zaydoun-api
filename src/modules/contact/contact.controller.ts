import { Request, Response } from "express";
import { contactService } from "./contact.service";
import { ApiResponse } from "../../shared/utils/response";
import { catchAsync } from "../../shared/utils/catchAsync";

export const contactController = {
  submit: catchAsync(async (req: Request, res: Response) => {
    await contactService.submit(req.body);
    return ApiResponse.success(
      res,
      null,
      "Message received — we'll be in touch soon.",
    );
  }),
};
