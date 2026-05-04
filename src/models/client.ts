import { z } from "zod/v4";

// Client entity interface
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

// Create client input schema
export const CreateClientInputSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.email(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;

// Update client input schema (all fields optional, but at least one required)
export const UpdateClientInputSchema = z.object({
  name: z.string().min(1, "Client name is required").optional(),
  email: z.email().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type UpdateClientInput = z.infer<typeof UpdateClientInputSchema>;
