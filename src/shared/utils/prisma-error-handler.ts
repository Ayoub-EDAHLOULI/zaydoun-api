import { Prisma } from "@prisma/client";
import { AppError } from "./errors";
import { StatusCodes } from "../constants/status-codes";

/**
 * Handle Prisma errors and convert them to user-friendly messages
 */
export function handlePrismaError(error: any): never {
  // Prisma Client Known Request Error (P2xxx codes)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation
        const target = (error.meta?.target as string[]) || [];
        const field = target[0] || "field";
        const fieldName = formatFieldName(field);
        throw new AppError(
          `${fieldName} already exists. Please use a different value.`,
          StatusCodes.CONFLICT,
        );
      }

      case "P2003": {
        // Foreign key constraint violation
        const field = (error.meta?.field_name as string) || "relation";
        throw new AppError(
          `Invalid ${field}. The referenced item does not exist.`,
          StatusCodes.BAD_REQUEST,
        );
      }

      case "P2025": {
        // Record not found
        throw new AppError(
          "The requested item was not found.",
          StatusCodes.NOT_FOUND,
        );
      }

      case "P2014": {
        // Required relation violation
        const relation = (error.meta?.relation_name as string) || "relation";
        throw new AppError(
          `Cannot delete this item because it has related ${relation}.`,
          StatusCodes.BAD_REQUEST,
        );
      }

      case "P2000": {
        // Value too long for column
        const column = (error.meta?.column_name as string) || "field";
        throw new AppError(
          `The value provided for ${column} is too long.`,
          StatusCodes.BAD_REQUEST,
        );
      }

      case "P2001": {
        // Record not found in where condition
        throw new AppError(
          "The requested item was not found.",
          StatusCodes.NOT_FOUND,
        );
      }

      default: {
        // Other Prisma errors
        throw new AppError(
          "A database error occurred. Please try again.",
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  // Prisma Client Validation Error
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new AppError(
      "Invalid data provided. Please check your input.",
      StatusCodes.BAD_REQUEST,
    );
  }

  // Unknown error
  throw error;
}

/**
 * Format field name to be more user-friendly
 */
function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    sku: "SKU",
    handle: "URL handle",
    email: "Email address",
    slug: "Slug",
    barcode: "Barcode",
    name: "Name",
    title: "Title",
  };

  return fieldMap[field] || field.charAt(0).toUpperCase() + field.slice(1);
}
