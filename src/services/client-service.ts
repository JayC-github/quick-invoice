import crypto from "crypto";
import {
  CreateClientInputSchema,
  UpdateClientInputSchema,
  type CreateClientInput,
  type UpdateClientInput,
  type Client,
} from "../models/client";
import {
  NotFoundError,
  ConflictError,
  ErrorCodes,
} from "../middleware/error-handler";
import { put, get, query, update, deleteItem, keys } from "../db/repository";

/**
 * Create a new client for the given user.
 * Validates input with Zod, generates a UUID clientId, and stores the record.
 */
export async function createClient(
  userId: string,
  data: CreateClientInput
): Promise<Client> {
  // Validate input
  const parsed = CreateClientInputSchema.parse(data);

  const clientId = crypto.randomUUID();
  const now = new Date().toISOString();

  const client: Client = {
    clientId,
    userId,
    name: parsed.name,
    email: parsed.email,
    companyName: parsed.companyName,
    address: parsed.address,
    phone: parsed.phone,
    createdAt: now,
    updatedAt: now,
  };

  await put({
    PK: keys.user.pk(userId),
    SK: keys.user.client(clientId),
    ...client,
  });

  return client;
}

/**
 * Get all clients for a user, sorted alphabetically by name.
 */
export async function getClients(userId: string): Promise<Client[]> {
  const items = await query(keys.user.pk(userId), "CLIENT#");

  const clients = items.map(itemToClient);

  // Sort alphabetically by name (case-insensitive)
  clients.sort((a, b) => a.name.localeCompare(b.name));

  return clients;
}

/**
 * Get a single client by userId and clientId.
 * Returns NOT_FOUND if the client does not exist.
 */
export async function getClient(
  userId: string,
  clientId: string
): Promise<Client> {
  const item = await get(keys.user.pk(userId), keys.user.client(clientId));

  if (!item) {
    throw new NotFoundError("Client not found");
  }

  return itemToClient(item);
}

/**
 * Update a client's fields. Only provided fields are updated.
 * Returns the updated client record.
 */
export async function updateClient(
  userId: string,
  clientId: string,
  data: UpdateClientInput
): Promise<Client> {
  // Validate input
  const parsed = UpdateClientInputSchema.parse(data);

  // Verify client exists
  const existing = await get(keys.user.pk(userId), keys.user.client(clientId));
  if (!existing) {
    throw new NotFoundError("Client not found");
  }

  // Build update fields from parsed input (only include defined fields)
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.email !== undefined) updates.email = parsed.email;
  if (parsed.companyName !== undefined) updates.companyName = parsed.companyName;
  if (parsed.address !== undefined) updates.address = parsed.address;
  if (parsed.phone !== undefined) updates.phone = parsed.phone;

  const updatedItem = await update(
    keys.user.pk(userId),
    keys.user.client(clientId),
    updates
  );

  return itemToClient(updatedItem);
}

/**
 * Delete a client. Checks for associated invoices first — if any exist,
 * throws ConflictError with CLIENT_HAS_INVOICES.
 */
export async function deleteClient(
  userId: string,
  clientId: string
): Promise<{ message: string }> {
  // Verify client exists
  const existing = await get(keys.user.pk(userId), keys.user.client(clientId));
  if (!existing) {
    throw new NotFoundError("Client not found");
  }

  // Check for associated invoices
  const invoices = await query(keys.user.pk(userId), "INVOICE#");
  const hasInvoices = invoices.some(
    (invoice) => invoice.clientId === clientId
  );

  if (hasInvoices) {
    throw new ConflictError(
      ErrorCodes.CLIENT_HAS_INVOICES,
      "Cannot delete client with existing invoices"
    );
  }

  await deleteItem(keys.user.pk(userId), keys.user.client(clientId));

  return { message: "Client deleted successfully" };
}

// --- Internal helpers ---

/**
 * Map a DynamoDB item to a Client interface.
 */
function itemToClient(item: Record<string, unknown>): Client {
  return {
    clientId: item.clientId as string,
    userId: item.userId as string,
    name: item.name as string,
    email: item.email as string,
    companyName: item.companyName as string | undefined,
    address: item.address as string | undefined,
    phone: item.phone as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
