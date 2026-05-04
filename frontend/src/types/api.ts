// TypeScript type definitions matching the QuickInvoice backend API responses.
// All monetary values are in cents unless otherwise noted.

// --- Auth ---

export interface LoginResponse {
  token: string;
  expiresAt: number;
}

export interface RegisterResponse {
  userId: string;
  message: string;
}

// --- Client ---

export interface Client {
  clientId: string;
  userId: string;
  name: string;
  email: string;
  companyName?: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  name: string;
  email: string;
  companyName?: string;
  address?: string;
  phone?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;

// --- Invoice ---

export interface LineItem {
  lineItemId: string;
  description: string;
  quantity: number;
  unitPrice: number; // cents
  amount: number; // cents
}

export type PaymentStatus = 'draft' | 'sent' | 'viewed' | 'paid';

export interface Invoice {
  invoiceId: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number; // cents
  taxRate: number;
  taxAmount: number; // cents
  total: number; // cents
  notes?: string;
  status: PaymentStatus;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  paymentAmount?: number; // cents
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  total: number; // cents
  status: PaymentStatus;
}

export interface CreateInvoiceInput {
  clientId: string;
  issueDate: string;
  dueDate: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
  notes?: string;
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

// --- Dashboard ---

export interface DashboardData {
  totalOutstanding: number; // cents
  totalPaid: number; // cents
  statusCounts: Record<PaymentStatus, number>;
  recentInvoices: InvoiceSummary[];
  overdueAmount: number; // cents
}

// --- Error ---

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
