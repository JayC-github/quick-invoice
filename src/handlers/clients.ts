import { withErrorHandler } from "../middleware/error-handler";
import type { LambdaResponse } from "../middleware/error-handler";
import { withAuth } from "../middleware/auth-middleware";
import type { APIGatewayProxyEvent, AuthenticatedEvent } from "../middleware/auth-middleware";
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
} from "../services/client-service";
import { CreateClientInputSchema, UpdateClientInputSchema } from "../models/client";
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
 * POST /clients
 * Creates a new client for the authenticated user.
 */
async function handleCreateClient(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const body = parseBody(event);
  const parsed = CreateClientInputSchema.parse(body);
  const result = await createClient(event.auth.userId, parsed);
  return jsonResponse(201, result);
}

/**
 * GET /clients
 * Returns all clients for the authenticated user, sorted alphabetically.
 */
async function handleGetClients(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const result = await getClients(event.auth.userId);
  return jsonResponse(200, result);
}

/**
 * GET /clients/{id}
 * Returns a single client by ID for the authenticated user.
 */
async function handleGetClient(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const clientId = event.pathParameters?.id;
  if (!clientId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing client ID" },
    });
  }
  const result = await getClient(event.auth.userId, clientId);
  return jsonResponse(200, result);
}

/**
 * PUT /clients/{id}
 * Updates a client's fields for the authenticated user.
 */
async function handleUpdateClient(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const clientId = event.pathParameters?.id;
  if (!clientId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing client ID" },
    });
  }
  const body = parseBody(event);
  const parsed = UpdateClientInputSchema.parse(body);
  const result = await updateClient(event.auth.userId, clientId, parsed);
  return jsonResponse(200, result);
}

/**
 * DELETE /clients/{id}
 * Deletes a client for the authenticated user.
 * Blocked if the client has associated invoices.
 */
async function handleDeleteClient(event: AuthenticatedEvent): Promise<LambdaResponse> {
  const clientId = event.pathParameters?.id;
  if (!clientId) {
    return jsonResponse(400, {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: "Missing client ID" },
    });
  }
  const result = await deleteClient(event.auth.userId, clientId);
  return jsonResponse(200, result);
}

/**
 * Client Lambda handler.
 *
 * All routes require authentication. Routes based on httpMethod + path:
 *   POST   /clients        → handleCreateClient
 *   GET    /clients         → handleGetClients
 *   GET    /clients/{id}    → handleGetClient
 *   PUT    /clients/{id}    → handleUpdateClient
 *   DELETE /clients/{id}    → handleDeleteClient
 *
 * Returns 404 for unmatched routes.
 */
const routeHandler = async (event: APIGatewayProxyEvent): Promise<LambdaResponse> => {
  const method = event.httpMethod.toUpperCase();
  const path = event.path;
  const hasId = event.pathParameters?.id;

  // All client routes require authentication
  const authHandler = (
    fn: (event: AuthenticatedEvent) => Promise<LambdaResponse>
  ) => withAuth(fn)(event);

  if (method === "POST" && path === "/clients") {
    return authHandler(handleCreateClient);
  }

  if (method === "GET" && path === "/clients" && !hasId) {
    return authHandler(handleGetClients);
  }

  if (method === "GET" && hasId) {
    return authHandler(handleGetClient);
  }

  if (method === "PUT" && hasId) {
    return authHandler(handleUpdateClient);
  }

  if (method === "DELETE" && hasId) {
    return authHandler(handleDeleteClient);
  }

  return jsonResponse(404, {
    error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" },
  });
};

export const handler = withErrorHandler(routeHandler);
