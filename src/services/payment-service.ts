import type { Invoice, LineItem } from "../models/invoice";
import {
  NotFoundError,
  ConflictError,
  ErrorCodes,
} from "../middleware/error-handler";
import { get, update, keys } from "../db/repository";

// --- Helpers ---

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

// --- Service Functions ---

/**
 * Mark an invoice as viewed.
 * Validates that the current status is "sent" — rejects with INVALID_STATUS_TRANSITION otherwise.
 * Records the viewedAt timestamp.
 *
 * Requirements: 13.1, 13.3, 13.4
 */
export async function markViewed(
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

  if (existing.status !== "sent") {
    throw new ConflictError(
      ErrorCodes.INVALID_STATUS_TRANSITION,
      "Invoice can only be marked as viewed when status is sent"
    );
  }

  const now = new Date().toISOString();

  const updatedItem = await update(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId),
    {
      status: "viewed",
      viewedAt: now,
      updatedAt: now,
    }
  );

  return itemToInvoice(updatedItem);
}

/**
 * Mark an invoice as paid.
 * Validates that the current status is "viewed" — rejects with INVALID_STATUS_TRANSITION otherwise.
 * Records the paidAt timestamp and paymentAmount.
 *
 * Requirements: 13.2, 13.3, 13.4
 */
export async function markPaid(
  userId: string,
  invoiceId: string,
  paymentAmount: number
): Promise<Invoice> {
  const existing = await get(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId)
  );

  if (!existing) {
    throw new NotFoundError("Invoice not found");
  }

  if (existing.status !== "viewed") {
    throw new ConflictError(
      ErrorCodes.INVALID_STATUS_TRANSITION,
      "Invoice can only be marked as paid when status is viewed"
    );
  }

  const now = new Date().toISOString();

  const updatedItem = await update(
    keys.user.pk(userId),
    keys.user.invoice(invoiceId),
    {
      status: "paid",
      paidAt: now,
      paymentAmount,
      updatedAt: now,
    }
  );

  return itemToInvoice(updatedItem);
}
