import { z } from "zod/v4";

// User entity interface
export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

// Registration input schema
export const RegisterInputSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

// Login input schema
export const LoginInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
