import { ZodError } from "zod/v4";
import type { ErrorResponse } from "../models/common";

// --- Custom Error Classes ---

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(code: string = "VALIDATION_ERROR", message: string = "Invalid request payload") {
    super(400, code, message);
  }
}

export class AuthenticationError extends AppError {
  constructor(code: string = "AUTHENTICATION_FAILED", message: string = "Authentication failed") {
    super(401, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}

// --- Error Code Constants ---

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  LINE_ITEMS_REQUIRED: "LINE_ITEMS_REQUIRED",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  NOT_FOUND: "NOT_FOUND",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  CLIENT_HAS_INVOICES: "CLIENT_HAS_INVOICES",
  INVOICE_NOT_DRAFT: "INVOICE_NOT_DRAFT",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  INVOICE_ALREADY_SENT: "INVOICE_ALREADY_SENT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

// --- Lambda Response Helper ---

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

function buildErrorResponse(statusCode: number, code: string, message: string): LambdaResponse {
  const body: ErrorResponse = {
    error: {
      code,
      message,
    },
  };
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// --- Error Handler Middleware ---

/**
 * Wraps a Lambda handler function with global error handling.
 * Catches all thrown errors and maps them to consistent ErrorResponse JSON.
 *
 * - AppError subclasses → mapped to their statusCode and code
 * - ZodError → 400 VALIDATION_ERROR with field-level details
 * - Unknown errors → 500 INTERNAL_ERROR (no internal details exposed)
 */
export function withErrorHandler<TEvent, TResult extends LambdaResponse>(
  handler: (event: TEvent) => Promise<TResult>
): (event: TEvent) => Promise<TResult | LambdaResponse> {
  return async (event: TEvent): Promise<TResult | LambdaResponse> => {
    try {
      return await handler(event);
    } catch (error: unknown) {
      // Custom application errors
      if (error instanceof AppError) {
        return buildErrorResponse(error.statusCode, error.code, error.message);
      }

      // Zod validation errors
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => issue.message)
          .join("; ");
        return buildErrorResponse(400, ErrorCodes.VALIDATION_ERROR, message);
      }

      // Unexpected errors — never expose internal details
      console.error("Unhandled error:", error);
      return buildErrorResponse(
        500,
        ErrorCodes.INTERNAL_ERROR,
        "An unexpected error occurred"
      );
    }
  };
}
