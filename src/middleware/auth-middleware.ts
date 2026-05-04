import { verifyToken } from "../services/auth-service";
import type { LambdaResponse } from "./error-handler";
import { AuthenticationError, ErrorCodes } from "./error-handler";

/**
 * Minimal API Gateway Proxy Event shape used by our handlers.
 * Avoids a hard dependency on @types/aws-lambda.
 */
export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined> | null;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
  requestContext?: Record<string, unknown>;
}

/**
 * Extends the base API Gateway event with an authenticated userId.
 * Downstream handlers receive this type after the auth middleware runs.
 */
export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  auth: {
    userId: string;
  };
}

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if the header is missing or not in "Bearer <token>" format.
 */
function extractBearerToken(event: APIGatewayProxyEvent): string | null {
  // Headers may arrive with varying casing from API Gateway
  const headers = event.headers ?? {};
  const authHeader =
    headers["Authorization"] ?? headers["authorization"] ?? undefined;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Auth middleware for protected Lambda routes.
 *
 * Wraps a handler that expects an AuthenticatedEvent. Before calling the
 * inner handler it:
 *   1. Extracts the Bearer token from the Authorization header
 *   2. Verifies the token via auth-service.verifyToken
 *   3. Attaches the userId to event.auth for downstream use
 *
 * On failure it returns a 401 response with TOKEN_EXPIRED or TOKEN_INVALID.
 */
export function withAuth(
  handler: (event: AuthenticatedEvent) => Promise<LambdaResponse>
): (event: APIGatewayProxyEvent) => Promise<LambdaResponse> {
  return async (event: APIGatewayProxyEvent): Promise<LambdaResponse> => {
    const token = extractBearerToken(event);

    if (!token) {
      return buildAuthErrorResponse(
        ErrorCodes.TOKEN_INVALID,
        "Missing or malformed Authorization header"
      );
    }

    try {
      const { userId } = await verifyToken(token);

      const authenticatedEvent: AuthenticatedEvent = {
        ...event,
        auth: { userId },
      };

      return handler(authenticatedEvent);
    } catch (error: unknown) {
      if (error instanceof AuthenticationError) {
        return buildAuthErrorResponse(error.code, error.message);
      }
      // Unexpected errors during token verification → treat as invalid token
      return buildAuthErrorResponse(
        ErrorCodes.TOKEN_INVALID,
        "Token is invalid"
      );
    }
  };
}

/**
 * Builds a 401 JSON response matching the project's ErrorResponse shape.
 */
function buildAuthErrorResponse(
  code: string,
  message: string
): LambdaResponse {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error: { code, message },
    }),
  };
}
