import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  withAuth,
  APIGatewayProxyEvent,
  AuthenticatedEvent,
} from "../../../src/middleware/auth-middleware";
import { AuthenticationError, ErrorCodes } from "../../../src/middleware/error-handler";

// Mock the auth-service module
vi.mock("../../../src/services/auth-service", () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from "../../../src/services/auth-service";
const mockVerifyToken = vi.mocked(verifyToken);

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: "GET",
    path: "/test",
    headers: {},
    pathParameters: null,
    queryStringParameters: null,
    body: null,
    ...overrides,
  };
}

const successHandler = async (event: AuthenticatedEvent) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: event.auth.userId }),
});

describe("withAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 TOKEN_INVALID when Authorization header is missing", async () => {
    const wrapped = withAuth(successHandler);
    const result = await wrapped(makeEvent());

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_INVALID");
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it("returns 401 TOKEN_INVALID when Authorization header has no Bearer prefix", async () => {
    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { Authorization: "Basic abc123" } })
    );

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 TOKEN_INVALID when Authorization header is just 'Bearer' with no token", async () => {
    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { Authorization: "Bearer" } })
    );

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 TOKEN_INVALID when Authorization header has extra segments", async () => {
    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { Authorization: "Bearer token extra" } })
    );

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_INVALID");
  });

  it("calls verifyToken and passes userId to handler on valid token", async () => {
    mockVerifyToken.mockResolvedValue({ userId: "user-123" });

    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { Authorization: "Bearer valid-token" } })
    );

    expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.userId).toBe("user-123");
  });

  it("returns 401 TOKEN_EXPIRED when verifyToken throws TOKEN_EXPIRED", async () => {
    mockVerifyToken.mockRejectedValue(
      new AuthenticationError(ErrorCodes.TOKEN_EXPIRED, "Token has expired")
    );

    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { Authorization: "Bearer expired-token" } })
    );

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_EXPIRED");
    expect(body.error.message).toBe("Token has expired");
  });

  it("returns 401 TOKEN_INVALID when verifyToken throws TOKEN_INVALID", async () => {
    mockVerifyToken.mockRejectedValue(
      new AuthenticationError(ErrorCodes.TOKEN_INVALID, "Token is invalid")
    );

    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { Authorization: "Bearer bad-token" } })
    );

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 TOKEN_INVALID on unexpected errors during verification", async () => {
    mockVerifyToken.mockRejectedValue(new Error("network failure"));

    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { Authorization: "Bearer some-token" } })
    );

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("TOKEN_INVALID");
    // Must not leak internal error details
    expect(body.error.message).not.toContain("network");
  });

  it("handles lowercase authorization header", async () => {
    mockVerifyToken.mockResolvedValue({ userId: "user-456" });

    const wrapped = withAuth(successHandler);
    const result = await wrapped(
      makeEvent({ headers: { authorization: "Bearer my-token" } })
    );

    expect(mockVerifyToken).toHaveBeenCalledWith("my-token");
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.userId).toBe("user-456");
  });

  it("preserves original event properties in the authenticated event", async () => {
    mockVerifyToken.mockResolvedValue({ userId: "user-789" });

    const handler = async (event: AuthenticatedEvent) => ({
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: event.auth.userId,
        path: event.path,
        method: event.httpMethod,
      }),
    });

    const wrapped = withAuth(handler);
    const result = await wrapped(
      makeEvent({
        httpMethod: "POST",
        path: "/invoices",
        headers: { Authorization: "Bearer token-xyz" },
        body: '{"data":"test"}',
      })
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.userId).toBe("user-789");
    expect(body.path).toBe("/invoices");
    expect(body.method).toBe("POST");
  });

  it("returns Content-Type application/json on auth errors", async () => {
    const wrapped = withAuth(successHandler);
    const result = await wrapped(makeEvent());

    expect(result.headers["Content-Type"]).toBe("application/json");
  });
});
