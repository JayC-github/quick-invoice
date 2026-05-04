import { withErrorHandler } from "../middleware/error-handler";
import type { LambdaResponse } from "../middleware/error-handler";
import { withAuth } from "../middleware/auth-middleware";
import type { APIGatewayProxyEvent, AuthenticatedEvent } from "../middleware/auth-middleware";
import { generatePdf } from "../services/pdf-service";
import { ErrorCodes } from "../middleware/error-handler";

/**
 * Builds a JSON error response.
 */
function jsonResponse(statusCode: number, body: unknown): LambdaResponse {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * GET /invoices/{id}/pdf
 * Generates and returns a PDF for the specified invoice.
 * The PDF is returned as a base64-encoded body for API Gateway binary support.
 */
async function handleGetPdf(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const invoiceId = event.pathParameters?.id;
  if (!invoiceId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing invoice ID" },
    });
  }

  const { buffer, filename } = await generatePdf(event.auth.userId, invoiceId);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body: buffer.toString("base64"),
    isBase64Encoded: true,
  };
}

/**
 * PDF Lambda handler.
 *
 * Routes:
 *   GET /invoices/{id}/pdf → handleGetPdf (auth required)
 *
 * Returns 404 for unmatched routes.
 */
const routeHandler = async (event: APIGatewayProxyEvent): Promise<LambdaResponse> => {
  const method = event.httpMethod.toUpperCase();
  const hasId = event.pathParameters?.id;

  if (method === "GET" && hasId) {
    return withAuth(handleGetPdf)(event);
  }

  return jsonResponse(404, {
    error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" },
  });
};

export const handler = withErrorHandler(routeHandler);
