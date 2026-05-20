import { Request, Response, NextFunction } from "express";

/**
 * Middleware to parse form-data fields before validation
 * Converts string booleans to actual booleans and JSON strings to objects
 * Also trims string fields to prevent empty/whitespace-only values
 */
export const parseFormData = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.body) {
    // Trim all string fields to remove whitespace and prevent null constraint violations
    if (typeof req.body.name === "string") {
      req.body.name = req.body.name.trim();
    }

    if (typeof req.body.handle === "string") {
      req.body.handle = req.body.handle.trim();
    }

    if (typeof req.body.website === "string") {
      req.body.website = req.body.website.trim();
    }

    // Parse featured field (string "true"/"false" to boolean)
    if (typeof req.body.featured === "string") {
      req.body.featured = req.body.featured === "true";
    }

    // Parse isActive field (string "true"/"false" to boolean)
    if (typeof req.body.isActive === "string") {
      req.body.isActive = req.body.isActive === "true";
    }

    // Parse sortOrder field (string to number)
    if (typeof req.body.sortOrder === "string") {
      req.body.sortOrder = parseInt(req.body.sortOrder, 10);
    }

    // Parse translations field (JSON string to array)
    if (typeof req.body.translations === "string") {
      try {
        req.body.translations = JSON.parse(req.body.translations);
      } catch (e) {
        // Leave as-is, validation will catch the error
      }
    }

    // Parse tagIds field (JSON string to array)
    if (typeof req.body.tagIds === "string") {
      try {
        req.body.tagIds = JSON.parse(req.body.tagIds);
      } catch (e) {
        // Leave as-is, validation will catch the error
      }
    }
  }

  next();
};
