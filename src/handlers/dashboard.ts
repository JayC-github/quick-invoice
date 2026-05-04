import { withErrorHandler } from "../middleware/error-handler";
import type { LambdaResponse } from "../middleware/error-handler";
import { withAuth } from "../middleware/auth-middleware";
import type { APIGatewayProxyEvent, AuthenticatedEvent } from "../middleware/auth-middleware";
import { getDashboard } from "../services/dashboard-service";
import { ErrorCodes } from "../middleware/error-handler";

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
 * GET /dashboard
 * Returns aggregated dashboard metrics for the authenticated user.
 */
async function handleGetDashboard(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const result = await getDashboard(event.auth.userId);
  return jsonResponse(200, result);
}

/**
 * Dashboard Lambda handler.
 *
 * Routes based on httpMethod:
 *   GET /dashboard → handleGetDashboard (auth required)
 *
 * Returns 404 for unmatched routes.
 */
const routeHandler = async (event: APIGatewayProxyEvent): Promise<LambdaResponse> => {
  const method = event.httpMethod.toUpperCase();

  if (method === "GET") {
    return withAuth(handleGetDashboard)(event);
  }

  return jsonResponse(404, {
    error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" },
  });
};

export const handler = withErrorHandler(routeHandler);
