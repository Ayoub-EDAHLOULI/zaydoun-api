import { Response } from "express";

/**
 * Standardized API Response Structure
 */
export class ApiResponse<T> {
  public success: boolean;
  public message: string;
  public data: T | null;
  public errors: string[];

  constructor(
    success: boolean,
    message: string,
    data: T | null = null,
    errors: string[] = [],
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }

  /**
   * Send a success response
   */
  public static success<T>(
    res: Response,
    data: T,
    message: string = "Request successful",
    statusCode: number = 200,
  ): Response {
    const response = new ApiResponse(true, message, data);
    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   */
  public static error(
    res: Response,
    message: string,
    statusCode: number = 400,
    errors: string[] = [],
  ): Response {
    const response = new ApiResponse<null>(false, message, null, errors);
    return res.status(statusCode).json(response);
  }
}
