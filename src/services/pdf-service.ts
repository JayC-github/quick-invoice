import PDFDocument from "pdfkit";
import { getInvoice } from "./invoice-service";
import { getClient } from "./client-service";
import { NotFoundError } from "../middleware/error-handler";

/**
 * Convert a monetary value in cents to a formatted dollar string.
 * e.g. 12345 → "$123.45", 0 → "$0.00"
 */
function formatCurrency(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Format a tax rate (decimal 0–1) as a percentage string.
 * e.g. 0.1 → "10.00%", 0 → "0.00%"
 */
function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Generate a PDF document for the given invoice.
 *
 * Fetches the invoice by userId + invoiceId (throws NOT_FOUND if missing),
 * fetches the associated client data, then builds a PDF containing all
 * required fields: invoice number, client details, dates, line items,
 * subtotal, tax, total, and notes.
 *
 * All monetary amounts in the PDF match stored invoice values exactly.
 *
 * Returns a buffer containing the PDF bytes and a filename formatted
 * as `{invoice_number}.pdf`.
 */
export async function generatePdf(
  userId: string,
  invoiceId: string
): Promise<{ buffer: Buffer; filename: string }> {
  // Fetch invoice — getInvoice throws NotFoundError if missing
  const invoice = await getInvoice(userId, invoiceId);

  // Fetch associated client data
  let client;
  try {
    client = await getClient(userId, invoice.clientId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      // Client was deleted but invoice still references it — use fallback values
      client = {
        clientId: invoice.clientId,
        userId,
        name: "Unknown Client",
        email: "",
        companyName: undefined,
        address: undefined,
        phone: undefined,
        createdAt: "",
        updatedAt: "",
      };
    } else {
      throw error;
    }
  }

  // Generate PDF in-memory
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    // --- Header: Invoice Number ---
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(`Invoice ${invoice.invoiceNumber}`, { align: "center" });

    doc.moveDown(1.5);

    // --- Client Information ---
    doc.fontSize(14).font("Helvetica-Bold").text("Bill To:");
    doc.fontSize(11).font("Helvetica");
    doc.text(client.name);
    if (client.email) {
      doc.text(client.email);
    }
    if (client.companyName) {
      doc.text(client.companyName);
    }
    if (client.address) {
      doc.text(client.address);
    }

    doc.moveDown(1);

    // --- Dates ---
    doc.fontSize(11).font("Helvetica");
    doc.text(`Issue Date: ${invoice.issueDate}`);
    doc.text(`Due Date: ${invoice.dueDate}`);

    doc.moveDown(1);

    // --- Line Items Table ---
    doc.fontSize(12).font("Helvetica-Bold");

    const tableTop = doc.y;
    const colDescription = 50;
    const colQuantity = 280;
    const colUnitPrice = 350;
    const colAmount = 450;

    // Table header
    doc.text("Description", colDescription, tableTop);
    doc.text("Qty", colQuantity, tableTop);
    doc.text("Unit Price", colUnitPrice, tableTop);
    doc.text("Amount", colAmount, tableTop);

    // Header underline
    doc
      .moveTo(colDescription, tableTop + 16)
      .lineTo(colAmount + 80, tableTop + 16)
      .stroke();

    // Table rows
    doc.fontSize(10).font("Helvetica");
    let rowY = tableTop + 24;

    for (const item of invoice.lineItems) {
      doc.text(item.description, colDescription, rowY, { width: 220 });
      doc.text(String(item.quantity), colQuantity, rowY);
      doc.text(formatCurrency(item.unitPrice), colUnitPrice, rowY);
      doc.text(formatCurrency(item.amount), colAmount, rowY);
      rowY += 20;
    }

    // Separator line after items
    doc.moveTo(colDescription, rowY).lineTo(colAmount + 80, rowY).stroke();

    rowY += 10;

    // --- Totals ---
    doc.fontSize(11).font("Helvetica");
    doc.text("Subtotal:", colUnitPrice, rowY);
    doc.text(formatCurrency(invoice.subtotal), colAmount, rowY);
    rowY += 18;

    doc.text(`Tax (${formatTaxRate(invoice.taxRate)}):`, colUnitPrice, rowY);
    doc.text(formatCurrency(invoice.taxAmount), colAmount, rowY);
    rowY += 18;

    doc.font("Helvetica-Bold");
    doc.text("Total:", colUnitPrice, rowY);
    doc.text(formatCurrency(invoice.total), colAmount, rowY);
    rowY += 28;

    // --- Notes ---
    if (invoice.notes) {
      doc.font("Helvetica-Bold").fontSize(12).text("Notes:", colDescription, rowY);
      rowY += 16;
      doc.font("Helvetica").fontSize(10).text(invoice.notes, colDescription, rowY, {
        width: 480,
      });
    }

    // Finalize the PDF
    doc.end();
  });

  return {
    buffer: pdfBuffer,
    filename: `${invoice.invoiceNumber}.pdf`,
  };
}
