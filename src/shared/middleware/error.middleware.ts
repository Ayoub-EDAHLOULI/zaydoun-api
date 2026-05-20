import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { StatusCodes } from "../constants/status-codes";
import { ApiResponse } from "../utils/response";

export const errorMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Default error
  let statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";

  // Handle operational errors (AppError)
  if (error instanceof AppError && error.isOperational) {
    statusCode = error.statusCode;
    message = error.message;
  }

  if (error.message?.includes("Only PDF files are allowed")) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Only PDF files are allowed";
  }

  if (error.message?.includes("File too large")) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "File size exceeds 50MB limit";
  }

  if (error.message?.includes("Unexpected field")) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid file field name. Expected field name: 'file'";
  }

  // Handle Prisma errors
  if ("code" in error) {
    const prismaError = error as any;

    if (prismaError.code === "P2002") {
      statusCode = StatusCodes.CONFLICT;
      message = "A record with this value already exists";
    } else if (prismaError.code === "P2025") {
      statusCode = StatusCodes.NOT_FOUND;
      message = "Record not found";
    }
  }

  return ApiResponse.error(res, message, statusCode);
};
