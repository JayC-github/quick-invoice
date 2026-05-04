import crypto from "crypto";
import {
  CreateInvoiceInputSchema,
  UpdateInvoiceInputSchema,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type Invoice,
  type InvoiceSummary,
  type LineItem,
} from "../models/invoice";
import {
  NotFoundError,
  ConflictError,
  ErrorCodes,
} from "../middleware/error-handler";
import {
  put,
  get,
  update,
  deleteItem,
  queryGSI1WithPrefix,
  keys,
} from "../db/repository";
import { generateInvoiceNumber } from "../utils/invoice-number";

// --- Helpers ---

/**
 * Calculate line item totals from input line items.
 * Each line item gets a generated lineItemId and computed amount.
 */
function buildLineItems(
  items: { description: string; quantity: number; unitPrice: number }[]
): LineItem[] {
  return items.map((item) => ({
    lineItemId: crypto.randomUUID(),
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.quantity * item.unitPrice,
  }));
}

/**
 * Calculate invoice totals from line items and tax rate.
 * All monetary values are in cents (integers).
 */
function calculateTotals(lineItems: LineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

/**
 * Map a DynamoDB item to an Invoice interface.
 */
function itemToInvoice(item: Record<string, unknown>): Invoice {
  return {
    invoiceId: item.invoiceId as string,
    userId: item.userId as string,
    clientId: item.clientId as string,
    invoiceNumber: item.invoiceNumber as string,
    issueDate: item.issueDate as string,
    dueDate: item.dueDate as string,
    lineItems: item.lineItems as LineItem[],
    subtotal: item.subtotal as number,
    taxRate: item.taxRate as number,
    taxAmount: item.taxAmount as number,
    total: item.total as number,
    notes: item.notes as string | undefined,
    status: item.status as Invoice["status"],
    sentAt: item.sentAt as string | undefined,
    viewedAt: item.viewedAt as string | undefined,
    paidAt: item.paidAt as string | undefined,
    paymentAmount: item.paymentAmount as number | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

/**
 * Map a DynamoDB item to an InvoiceSummary.
 */
function itemToInvoiceSummary(item: Record<string, unknown>): InvoiceSummary {
  return {
    invoiceId: item.invoiceId as string,
    invoiceNumber: item.invoiceNumber as string,
    clientId: item.clientId as string,
    issueDate: item.issueDate as string,
    dueDate: item.dueDate as string,
    total: item.total as number,
    status: item.status as InvoiceSummary["status"],
  };
}

// --- Service Functions ---

/**
 * Create a new invoice for the given user.
 * Validates input, generates invoiceId + invoiceNumber, calculates totals,
 * sets status to draft, and stores the invoice.
 */
export async function createInvoice(
  userId: string,
  data: CreateInvoiceInput
): Promise<Invoice> {
  const parsed = CreateInvoiceInputSchema.parse(data);

  const invoiceId = crypto.randomUUID();
  const invoiceNumber = await generateInvoiceNumber(userId);
  const now = new Date().toISOString();

  const lineItems = buildLineItems(parsed.lineItems);
  const taxRate = parsed.taxRate ?? 0;
  const { subtotal, taxAmount, total } = calculateTotals(lineItems, taxRate);

  const invoice: Invoice = {
    invoiceId,
    userId,
    clientId: parsed.clientId,
    invoiceNumber,
    issueDate: parsed.issueDate,
    dueDate: parsed.dueDate,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    notes: parsed.notes,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  await put({
    PK: keys.user.pk(userId),
    SK: keys.user.invoice(invoiceId),
    GSI1PK: keys.gsi1.invoiceDatePk(userId),
    GSI1SK: keys.gsi1.invoiceDateSk(parsed.issueDate),
    ...invoice,
  });

  return invoice;
}

/**
 * Get all invoices for a user, sorted by issue date descending (most recent first).
 * Uses GSI1 with INVOICE_DATE# prefix and scanIndexForward=false.
 */
export async function getInvoices(userId: string): Promise<InvoiceSummary[]> {
  const items = await queryGSI1WithPrefix(
    keys.gsi1.invoiceDatePk(userId),
    "INVOICE_DATE#",
    false
  );

  return items.map(itemToInvoiceSummary);
}

/**
 * Get a single invoice by userId and invoiceId.
 * Returns NOT_FOUND if the invoice does not exist.
 */
export async function getInvoice(
  userId: string,
  invoiceId: string
): Promise<Invoice> {
  const item = await get(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId)
  );

  if (!item) {
    throw new NotFoundError("Invoice not found");
  }

  return itemToInvoice(item);
}

/**
 * Update a draft invoice. Only draft invoices can be updated.
 * Recalculates totals if line items or tax rate change.
 */
export async function updateInvoice(
  userId: string,
  invoiceId: string,
  data: UpdateInvoiceInput
): Promise<Invoice> {
  const parsed = UpdateInvoiceInputSchema.parse(data);

  // Fetch existing invoice
  const existing = await get(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId)
  );

  if (!existing) {
    throw new NotFoundError("Invoice not found");
  }

  // Only draft invoices can be updated
  if (existing.status !== "draft") {
    throw new ConflictError(
      ErrorCodes.INVOICE_NOT_DRAFT,
      "Only draft invoices can be updated"
    );
  }

  const now = new Date().toISOString();

  // Determine the effective line items and tax rate after the update
  const newLineItems = parsed.lineItems
    ? buildLineItems(parsed.lineItems)
    : (existing.lineItems as LineItem[]);
  const newTaxRate = parsed.taxRate !== undefined ? parsed.taxRate : (existing.taxRate as number);
  const { subtotal, taxAmount, total } = calculateTotals(newLineItems, newTaxRate);

  // Build update fields
  const updates: Record<string, unknown> = {
    updatedAt: now,
    lineItems: newLineItems,
    subtotal,
    taxRate: newTaxRate,
    taxAmount,
    total,
  };

  if (parsed.clientId !== undefined) updates.clientId = parsed.clientId;
  if (parsed.issueDate !== undefined) updates.issueDate = parsed.issueDate;
  if (parsed.dueDate !== undefined) updates.dueDate = parsed.dueDate;
  if (parsed.notes !== undefined) updates.notes = parsed.notes;

  // Update GSI1SK if issueDate changed
  if (parsed.issueDate !== undefined) {
    updates.GSI1SK = keys.gsi1.invoiceDateSk(parsed.issueDate);
  }

  const updatedItem = await update(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId),
    updates
  );

  return itemToInvoice(updatedItem);
}

/**
 * Delete a draft invoice. Only draft invoices can be deleted.
 */
export async function deleteInvoice(
  userId: string,
  invoiceId: string
): Promise<{ message: string }> {
  const existing = await get(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId)
  );

  if (!existing) {
    throw new NotFoundError("Invoice not found");
  }

  if (existing.status !== "draft") {
    throw new ConflictError(
      ErrorCodes.INVOICE_NOT_DRAFT,
      "Only draft invoices can be deleted"
    );
  }

  await deleteItem(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId)
  );

  return { message: "Invoice deleted successfully" };
}

/**
 * Send a draft invoice. Updates status to sent, records sentAt timestamp.
 * Only draft invoices can be sent.
 * Email notification is a stub/no-op for now.
 */
export async function sendInvoice(
  userId: string,
  invoiceId: string
): Promise<Invoice> {
  const existing = await get(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId)
  );

  if (!existing) {
    throw new NotFoundError("Invoice not found");
  }

  if (existing.status !== "draft") {
    throw new ConflictError(
      ErrorCodes.INVOICE_ALREADY_SENT,
      "Invoice has already been sent"
    );
  }

  const now = new Date().toISOString();

  const updatedItem = await update(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId),
    {
      status: "sent",
      sentAt: now,
      updatedAt: now,
    }
  );

  // TODO: Trigger email notification (stub/no-op for now)

  return itemToInvoice(updatedItem);
}
