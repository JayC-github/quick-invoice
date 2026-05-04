import { withErrorHandler } from "../middleware/error-handler";
import type { LambdaResponse } from "../middleware/error-handler";
import { withAuth } from "../middleware/auth-middleware";
import type { APIGatewayProxyEvent, AuthenticatedEvent } from "../middleware/auth-middleware";
import { markViewed, markPaid } from "../services/payment-service";
import { ErrorCodes, ValidationError } from "../middleware/error-handler";

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
 * POST /invoices/{id}/view?userId=xxx
 * Public endpoint — no auth required.
 * Marks an invoice as viewed when a client opens the invoice link.
 * Requires userId as a query parameter and invoiceId from path parameters.
 */
async function handleViewInvoice(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const invoiceId = event.pathParameters?.id;
  if (!invoiceId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing invoice ID" },
    });
  }

  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing userId query parameter" },
    });
  }

  const result = await markViewed(userId, invoiceId);
  return jsonResponse(200, result);
}

/**
 * POST /invoices/{id}/pay
 * Auth required.
 * Marks an invoice as paid with the provided payment amount.
 */
async function handlePayInvoice(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const invoiceId = event.pathParameters?.id;
  if (!invoiceId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing invoice ID" },
    });
  }

  const body = parseBody(event);
  const paymentAmount = body.paymentAmount;

  if (typeof paymentAmount !== "number" || paymentAmount < 0) {
    throw new ValidationError(
      ErrorCodes.VALIDATION_ERROR,
      "paymentAmount is required and must be a non-negative number"
    );
  }

  const result = await markPaid(event.auth.userId, invoiceId, paymentAmount);
  return jsonResponse(200, result);
}

/**
 * Payment Lambda handler.
 *
 * Routes based on httpMethod + path:
 *   POST /invoices/{id}/view  → handleViewInvoice (public, no auth)
 *   POST /invoices/{id}/pay   → handlePayInvoice  (auth required)
 *
 * Returns 404 for unmatched routes.
 */
const routeHandler = async (event: APIGatewayProxyEvent): Promise<LambdaResponse> => {
  const method = event.httpMethod.toUpperCase();
  const path = event.path;
  const hasId = event.pathParameters?.id;

  if (method === "POST" && hasId && path.endsWith("/view")) {
    return handleViewInvoice(event);
  }

  if (method === "POST" && hasId && path.endsWith("/pay")) {
    return withAuth(handlePayInvoice)(event);
  }

  return jsonResponse(404, {
    error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" },
  });
};

export const handler = withErrorHandler(routeHandler);
