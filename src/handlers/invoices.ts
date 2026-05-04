import { withErrorHandler } from "../middleware/error-handler";
import type { LambdaResponse } from "../middleware/error-handler";
import { withAuth } from "../middleware/auth-middleware";
import type { APIGatewayProxyEvent, AuthenticatedEvent } from "../middleware/auth-middleware";
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
} from "../services/invoice-service";
import { CreateInvoiceInputSchema, UpdateInvoiceInputSchema } from "../models/invoice";
import { ErrorCodes } from "../middleware/error-handler";

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
 * POST /invoices
 * Creates a new invoice for the authenticated user.
 */
async function handleCreateInvoice(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const body = parseBody(event);
  const parsed = CreateInvoiceInputSchema.parse(body);
  const result = await createInvoice(event.auth.userId, parsed);
  return jsonResponse(201, result);
}

/**
 * GET /invoices
 * Returns all invoices for the authenticated user, sorted by issue date descending.
 */
async function handleGetInvoices(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const result = await getInvoices(event.auth.userId);
  return jsonResponse(200, result);
}

/**
 * GET /invoices/{id}
 * Returns a single invoice by ID for the authenticated user.
 */
async function handleGetInvoice(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const invoiceId = event.pathParameters?.id;
  if (!invoiceId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing invoice ID" },
    });
  }
  const result = await getInvoice(event.auth.userId, invoiceId);
  return jsonResponse(200, result);
}

/**
 * PUT /invoices/{id}
 * Updates a draft invoice's fields for the authenticated user.
 */
async function handleUpdateInvoice(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const invoiceId = event.pathParameters?.id;
  if (!invoiceId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing invoice ID" },
    });
  }
  const body = parseBody(event);
  const parsed = UpdateInvoiceInputSchema.parse(body);
  const result = await updateInvoice(event.auth.userId, invoiceId, parsed);
  return jsonResponse(200, result);
}

/**
 * DELETE /invoices/{id}
 * Deletes a draft invoice for the authenticated user.
 */
async function handleDeleteInvoice(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const invoiceId = event.pathParameters?.id;
  if (!invoiceId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing invoice ID" },
    });
  }
  const result = await deleteInvoice(event.auth.userId, invoiceId);
  return jsonResponse(200, result);
}

/**
 * POST /invoices/{id}/send
 * Sends a draft invoice for the authenticated user.
 */
async function handleSendInvoice(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const invoiceId = event.pathParameters?.id;
  if (!invoiceId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing invoice ID" },
    });
  }
  const result = await sendInvoice(event.auth.userId, invoiceId);
  return jsonResponse(200, result);
}

/**
 * Invoice Lambda handler.
 *
 * All routes require authentication. Routes based on httpMethod + path:
 *   POST   /invoices             → handleCreateInvoice
 *   GET    /invoices              → handleGetInvoices
 *   GET    /invoices/{id}         → handleGetInvoice
 *   PUT    /invoices/{id}         → handleUpdateInvoice
 *   DELETE /invoices/{id}         → handleDeleteInvoice
 *   POST   /invoices/{id}/send   → handleSendInvoice
 *
 * Returns 404 for unmatched routes.
 */
const routeHandler = async (event: APIGatewayProxyEvent): Promise<LambdaResponse> => {
  const method = event.httpMethod.toUpperCase();
  const path = event.path;
  const hasId = event.pathParameters?.id;

  // All invoice routes require authentication
  const authHandler = (
    fn: (event: AuthenticatedEvent) => Promise<LambdaResponse>
  ) => withAuth(fn)(event);

  // POST /invoices/{id}/send — must check before POST /invoices
  if (method === "POST" && hasId && path.endsWith("/send")) {
    return authHandler(handleSendInvoice);
  }

  if (method === "POST" && path === "/invoices") {
    return authHandler(handleCreateInvoice);
  }

  if (method === "GET" && path === "/invoices" && !hasId) {
    return authHandler(handleGetInvoices);
  }

  if (method === "GET" && hasId) {
    return authHandler(handleGetInvoice);
  }

  if (method === "PUT" && hasId) {
    return authHandler(handleUpdateInvoice);
  }

  if (method === "DELETE" && hasId) {
    return authHandler(handleDeleteInvoice);
  }

  return jsonResponse(404, {
    error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" },
  });
};

export const handler = withErrorHandler(routeHandler);
