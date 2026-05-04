import { withErrorHandler, ValidationError, ErrorCodes } from "../middleware/error-handler";
import type { LambdaResponse } from "../middleware/error-handler";
import { withAuth } from "../middleware/auth-middleware";
import type { APIGatewayProxyEvent, AuthenticatedEvent } from "../middleware/auth-middleware";
import { register, login, logout } from "../services/auth-service";
import { RegisterInputSchema, LoginInputSchema } from "../models/user";

/**
 * Parses the JSON body from an API Gateway event.
 * Returns an empty object if the body is missing or invalid.
 */
function parseBody(event: APIGatewayProxyEvent): Record<string, unknown> {
  if (!event.body) {
    return {};
  }
  try {
    return JSON.parse(event.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Builds a success JSON response.
 */
function jsonResponse(statusCode: number, body: unknown): LambdaResponse {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * POST /auth/register
 * Validates input with RegisterInputSchema, then delegates to auth-service.register.
 */
async function handleRegister(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const body = parseBody(event);
  const parsed = RegisterInputSchema.parse(body);
  const result = await register(parsed.email, parsed.password);
  return jsonResponse(201, result);
}

/**
 * POST /auth/login
 * Validates input with LoginInputSchema, then delegates to auth-service.login.
 */
async function handleLogin(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const body = parseBody(event);
  const parsed = LoginInputSchema.parse(body);
  const result = await login(parsed.email, parsed.password);
  return jsonResponse(200, result);
}

/**
 * POST /auth/logout (requires auth)
 * Extracts the Bearer token from the Authorization header and delegates to auth-service.logout.
 */
async function handleLogout(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const authHeader = event.headers["Authorization"] ?? event.headers["authorization"] ?? "";
  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new ValidationError(ErrorCodes.VALIDATION_ERROR, "Missing authorization token");
  }

  const result = await logout(token);
  return jsonResponse(200, result);
}

/**
 * Auth Lambda handler.
 *
 * Routes requests based on httpMethod + path:
 *   POST /auth/register → handleRegister
 *   POST /auth/login    → handleLogin
 *   POST /auth/logout   → handleLogout (auth required)
 *
 * Returns 404 for unmatched routes.
 */
const routeHandler = async (event: APIGatewayProxyEvent): Promise<LambdaResponse> => {
  const method = event.httpMethod.toUpperCase();
  const path = event.path;

  if (method === "POST" && path === "/auth/register") {
    return handleRegister(event);
  }

  if (method === "POST" && path === "/auth/login") {
    return handleLogin(event);
  }

  if (method === "POST" && path === "/auth/logout") {
    // Logout requires authentication — delegate to withAuth-wrapped handler
    return withAuth(handleLogout)(event);
  }

  return jsonResponse(404, {
    error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" },
  });
};

export const handler = withErrorHandler(routeHandler);
