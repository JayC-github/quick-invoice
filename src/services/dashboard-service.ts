import type { PaymentStatus } from "../models/common";
import type { InvoiceSummary } from "../models/invoice";
import { queryGSI1WithPrefix, keys } from "../db/repository";

// --- Dashboard Data Interface ---

export interface DashboardData {
  totalOutstanding: number;
  totalPaid: number;
  statusCounts: Record<PaymentStatus, number>;
  recentInvoices: InvoiceSummary[];
  overdueAmount: number;
}

// --- Helpers ---

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
    status: item.status as PaymentStatus,
  };
}

// --- Service Function ---

/**
 * Get dashboard data for a user.
 * Queries all invoices via GSI1 sorted by issue date descending,
 * then computes all metrics in the application layer.
 *
 * All monetary values are in cents (integers).
 */
export async function getDashboard(userId: string): Promise<DashboardData> {
  // Query all invoices for the user, sorted by issue date descending
  const items = await queryGSI1WithPrefix(
    keys.gsi1.invoiceDatePk(userId),
    "INVOICE_DATE#",
    false
  );

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let totalOutstanding = 0;
  let totalPaid = 0;
  let overdueAmount = 0;

  const statusCounts: Record<PaymentStatus, number> = {
    draft: 0,
    sent: 0,
    viewed: 0,
    paid: 0,
  };

  for (const item of items) {
    const status = item.status as PaymentStatus;
    const total = item.total as number;
    const dueDate = item.dueDate as string;

    // Status counts
    statusCounts[status] += 1;

    // Financial aggregations
    if (status === "sent" || status === "viewed") {
      totalOutstanding += total;

      if (dueDate < today) {
        overdueAmount += total;
      }
    } else if (status === "paid") {
      totalPaid += total;
    }
  }

  // Recent invoices: already sorted descending by issue date from the query, take first 10
  const recentInvoices = items.slice(0, 10).map(itemToInvoiceSummary);

  return {
    totalOutstanding,
    totalPaid,
    statusCounts,
    recentInvoices,
    overdueAmount,
  };
}
