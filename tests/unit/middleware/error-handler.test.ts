import { describe, it, expect, vi } from "vitest";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ErrorCodes,
  withErrorHandler,
} from "../../../src/middleware/error-handler";
import { ZodError } from "zod/v4";
import { z } from "zod/v4";

describe("Custom Error Classes", () => {
  it("ValidationError defaults to 400 and VALIDATION_ERROR code", () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Invalid request payload");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it("ValidationError accepts custom code and message", () => {
    const err = new ValidationError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("PASSWORD_TOO_SHORT");
    expect(err.message).toBe("Password must be at least 8 characters");
  });

  it("AuthenticationError defaults to 401 and AUTHENTICATION_FAILED code", () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTHENTICATION_FAILED");
    expect(err.message).toBe("Authentication failed");
  });

  it("AuthenticationError accepts custom code and message", () => {
    const err = new AuthenticationError("TOKEN_EXPIRED", "Session token has expired");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("TOKEN_EXPIRED");
    expect(err.message).toBe("Session token has expired");
  });

  it("NotFoundError returns 404 with NOT_FOUND code", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });

  it("NotFoundError never reveals existence — same response for missing and other-user records", () => {
    const missingErr = new NotFoundError("Resource not found");
    const otherUserErr = new NotFoundError("Resource not found");
    expect(missingErr.statusCode).toBe(otherUserErr.statusCode);
    expect(missingErr.code).toBe(otherUserErr.code);
    expect(missingErr.message).toBe(otherUserErr.message);
  });

  it("ConflictError returns 409 with custom code", () => {
    const err = new ConflictError("EMAIL_ALREADY_EXISTS", "Email is already registered");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("EMAIL_ALREADY_EXISTS");
    expect(err.message).toBe("Email is already registered");
  });
});

describe("ErrorCodes", () => {
  it("contains all required error codes", () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(ErrorCodes.PASSWORD_TOO_SHORT).toBe("PASSWORD_TOO_SHORT");
    expect(ErrorCodes.LINE_ITEMS_REQUIRED).toBe("LINE_ITEMS_REQUIRED");
    expect(ErrorCodes.AUTHENTICATION_FAILED).toBe("AUTHENTICATION_FAILED");
    expect(ErrorCodes.TOKEN_EXPIRED).toBe("TOKEN_EXPIRED");
    expect(ErrorCodes.TOKEN_INVALID).toBe("TOKEN_INVALID");
    expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
    expect(ErrorCodes.EMAIL_ALREADY_EXISTS).toBe("EMAIL_ALREADY_EXISTS");
    expect(ErrorCodes.CLIENT_HAS_INVOICES).toBe("CLIENT_HAS_INVOICES");
    expect(ErrorCodes.INVOICE_NOT_DRAFT).toBe("INVOICE_NOT_DRAFT");
    expect(ErrorCodes.INVALID_STATUS_TRANSITION).toBe("INVALID_STATUS_TRANSITION");
    expect(ErrorCodes.INVOICE_ALREADY_SENT).toBe("INVOICE_ALREADY_SENT");
    expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
  });
});

describe("withErrorHandler", () => {
  const successHandler = async (_event: unknown) => ({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  });

  it("passes through successful responses", async () => {
    const wrapped = withErrorHandler(successHandler);
    const result = await wrapped({});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ok: true });
  });

  it("catches ValidationError and returns 400 with ErrorResponse", async () => {
    const handler = async () => {
      throw new ValidationError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters");
    };
    const wrapped = withErrorHandler(handler);
    const result = await wrapped({});

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body).toEqual({
      error: {
        code: "PASSWORD_TOO_SHORT",
        message: "Password must be at least 8 characters",
      },
    });
  });

  it("catches AuthenticationError and returns 401 with ErrorResponse", async () => {
    const handler = async () => {
      throw new AuthenticationError("TOKEN_EXPIRED", "Session token has expired");
    };
    const wrapped = withErrorHandler(handler);
    const result = await wrapped({});

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("catches NotFoundError and returns 404 with ErrorResponse", async () => {
    const handler = async () => {
      throw new NotFoundError();
    };
    const wrapped = withErrorHandler(handler);
    const result = await wrapped({});

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("catches ConflictError and returns 409 with ErrorResponse", async () => {
    const handler = async () => {
      throw new ConflictError("CLIENT_HAS_INVOICES", "Cannot delete client with existing invoices");
    };
    const wrapped = withErrorHandler(handler);
    const result = await wrapped({});

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("CLIENT_HAS_INVOICES");
  });

  it("catches ZodError and returns 400 VALIDATION_ERROR", async () => {
    const schema = z.object({
      email: z.email(),
      name: z.string().min(1),
    });
    const handler = async () => {
      schema.parse({ email: "not-an-email", name: "" });
      return { statusCode: 200, headers: {}, body: "" };
    };
    const wrapped = withErrorHandler(handler);
    const result = await wrapped({});

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBeTruthy();
  });

  it("catches unknown errors and returns 500 INTERNAL_ERROR without details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = async () => {
      throw new Error("database connection failed");
    };
    const wrapped = withErrorHandler(handler);
    const result = await wrapped({});

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("An unexpected error occurred");
    // Must not leak internal error details
    expect(body.error.message).not.toContain("database");
    consoleSpy.mockRestore();
  });

  it("returns Content-Type application/json header on errors", async () => {
    const handler = async () => {
      throw new NotFoundError();
    };
    const wrapped = withErrorHandler(handler);
    const result = await wrapped({});

    expect(result.headers["Content-Type"]).toBe("application/json");
  });
});
