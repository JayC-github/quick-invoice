import { z } from "zod/v4";
import type { PaymentStatus } from "./common";

// Line item entity interface
export interface LineItem {
  lineItemId: string;
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  amount: number; // quantity × unitPrice, in cents
}

// Invoice entity interface
export interface Invoice {
  invoiceId: string;
  userId: string;
  clientId: string;
  invoiceNumber: string; // INV-XXXXX format
  issueDate: string; // ISO 8601 date
  dueDate: string; // ISO 8601 date
  lineItems: LineItem[];
  subtotal: number; // in cents
  taxRate: number; // decimal, default 0
  taxAmount: number; // in cents
  total: number; // in cents
  notes?: string;
  status: PaymentStatus;
  sentAt?: string; // ISO 8601
  viewedAt?: string; // ISO 8601
  paidAt?: string; // ISO 8601
  paymentAmount?: number; // in cents
  createdAt: string;
  updatedAt: string;
}

// Invoice summary for list views
export interface InvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  total: number;
  status: PaymentStatus;
}

// Line item input schema
export const LineItemInputSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().int("Unit price must be an integer (cents)").min(0, "Unit price must be non-negative"),
});

export type LineItemInput = z.infer<typeof LineItemInputSchema>;

// Create invoice input schema
export const CreateInvoiceInputSchema = z
  .object({
    clientId: z.string().min(1, "Client ID is required"),
    issueDate: z.string().date("Issue date must be a valid date (YYYY-MM-DD)"),
    dueDate: z.string().date("Due date must be a valid date (YYYY-MM-DD)"),
    lineItems: z.array(LineItemInputSchema).min(1, "At least one line item is required"),
    taxRate: z.number().min(0, "Tax rate must be at least 0").max(1, "Tax rate must be at most 1").optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Due date must be on or after issue date",
    path: ["dueDate"],
  });

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

// Update invoice input schema
export const UpdateInvoiceInputSchema = z
  .object({
    clientId: z.string().min(1, "Client ID is required").optional(),
    issueDate: z.string().date("Issue date must be a valid date (YYYY-MM-DD)").optional(),
    dueDate: z.string().date("Due date must be a valid date (YYYY-MM-DD)").optional(),
    lineItems: z.array(LineItemInputSchema).min(1, "At least one line item is required").optional(),
    taxRate: z.number().min(0, "Tax rate must be at least 0").max(1, "Tax rate must be at most 1").optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // Only validate if both dates are provided
      if (data.issueDate && data.dueDate) {
        return data.dueDate >= data.issueDate;
      }
      return true;
    },
    {
      message: "Due date must be on or after issue date",
      path: ["dueDate"],
    }
  );

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
