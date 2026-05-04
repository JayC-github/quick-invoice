import { atomicIncrement, keys } from "../db/repository";

/**
 * Generate the next sequential invoice number for a user.
 *
 * Uses a DynamoDB atomic counter to ensure uniqueness even under
 * concurrent requests. The counter is scoped per user so each user
 * has an independent sequence (INV-00001, INV-00002, …).
 */
export async function generateInvoiceNumber(
  userId: string
): Promise<string> {
  const pk = keys.user.pk(userId);
  const sk = keys.user.invoiceCounter();

  const counter = await atomicIncrement(pk, sk, "counter");

  return formatInvoiceNumber(counter);
}

/**
 * Format a numeric counter value as INV-XXXXX (zero-padded to 5 digits).
 */
export function formatInvoiceNumber(counter: number): string {
  return `INV-${String(counter).padStart(5, "0")}`;
}
