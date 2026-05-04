import express from "express";
import type { Request, Response } from "express";
import type { APIGatewayProxyEvent } from "./middleware/auth-middleware";
import type { LambdaResponse } from "./middleware/error-handler";

import { handler as authHandler } from "./handlers/auth";
import { handler as clientsHandler } from "./handlers/clients";
import { handler as invoicesHandler } from "./handlers/invoices";
import { handler as paymentsHandler } from "./handlers/payments";
import { handler as dashboardHandler } from "./handlers/dashboard";
import { handler as pdfHandler } from "./handlers/pdf";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS middleware for local development
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

/**
 * Convert an Express request into the APIGatewayProxyEvent shape
 * that our Lambda handlers expect.
 */
function toEvent(req: Request, pathParams?: Record<string, string>): APIGatewayProxyEvent {
  return {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers as Record<string, string>,
    pathParameters: pathParams ?? null,
    queryStringParameters: (Object.keys(req.query).length > 0
      ? (req.query as Record<string, string>)
      : null),
    body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null,
  };
}

/**
 * Send a LambdaResponse back through Express.
 */
function sendLambdaResponse(res: Response, lambdaRes: LambdaResponse): void {
  // Set headers
  for (const [key, value] of Object.entries(lambdaRes.headers)) {
    res.setHeader(key, value);
  }

  res.status(lambdaRes.statusCode);

  // Handle base64-encoded binary responses (PDF)
  if (lambdaRes.isBase64Encoded) {
    const buffer = Buffer.from(lambdaRes.body, "base64");
    res.end(buffer);
  } else {
    res.send(lambdaRes.body);
  }
}

/**
 * Generic route adapter: converts Express req/res into a Lambda handler call.
 */
function adapt(
  handler: (event: APIGatewayProxyEvent) => Promise<LambdaResponse>,
  pathParams?: (req: Request) => Record<string, string>
) {
  return async (req: Request, res: Response) => {
    try {
      const event = toEvent(req, pathParams?.(req));
      const result = await handler(event);
      sendLambdaResponse(res, result);
    } catch (err) {
      console.error("Unhandled error in local server:", err);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
    }
  };
}

// --- Auth routes ---
app.post("/auth/register", adapt(authHandler));
app.post("/auth/login", adapt(authHandler));
app.post("/auth/logout", adapt(authHandler));

// --- Client routes ---
app.post("/clients", adapt(clientsHandler));
app.get("/clients", adapt(clientsHandler));
app.get("/clients/:id", adapt(clientsHandler, (req) => ({ id: req.params.id })));
app.put("/clients/:id", adapt(clientsHandler, (req) => ({ id: req.params.id })));
app.delete("/clients/:id", adapt(clientsHandler, (req) => ({ id: req.params.id })));

// --- Invoice routes ---
app.post("/invoices", adapt(invoicesHandler));
app.get("/invoices", adapt(invoicesHandler));
app.get("/invoices/:id/pdf", adapt(pdfHandler, (req) => ({ id: req.params.id })));
app.get("/invoices/:id", adapt(invoicesHandler, (req) => ({ id: req.params.id })));
app.put("/invoices/:id", adapt(invoicesHandler, (req) => ({ id: req.params.id })));
app.delete("/invoices/:id", adapt(invoicesHandler, (req) => ({ id: req.params.id })));
app.post("/invoices/:id/send", adapt(invoicesHandler, (req) => ({ id: req.params.id })));
app.post("/invoices/:id/view", adapt(paymentsHandler, (req) => ({ id: req.params.id })));
app.post("/invoices/:id/pay", adapt(paymentsHandler, (req) => ({ id: req.params.id })));

// --- Dashboard ---
app.get("/dashboard", adapt(dashboardHandler));

// --- Start ---
app.listen(PORT, () => {
  console.log(`\n  QuickInvoice API running at http://localhost:${PORT}\n`);
  console.log("  Routes:");
  console.log("    POST   /auth/register");
  console.log("    POST   /auth/login");
  console.log("    POST   /auth/logout");
  console.log("    POST   /clients");
  console.log("    GET    /clients");
  console.log("    GET    /clients/:id");
  console.log("    PUT    /clients/:id");
  console.log("    DELETE /clients/:id");
  console.log("    POST   /invoices");
  console.log("    GET    /invoices");
  console.log("    GET    /invoices/:id");
  console.log("    PUT    /invoices/:id");
  console.log("    DELETE /invoices/:id");
  console.log("    POST   /invoices/:id/send");
  console.log("    POST   /invoices/:id/view   (public)");
  console.log("    POST   /invoices/:id/pay");
  console.log("    GET    /invoices/:id/pdf");
  console.log("    GET    /dashboard");
  console.log("");
});
