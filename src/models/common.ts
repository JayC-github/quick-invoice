import { z } from "zod/v4";

// Payment status type
export const PaymentStatusEnum = z.enum(["draft", "sent", "viewed", "paid"]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

// Error response
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Pagination types
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
