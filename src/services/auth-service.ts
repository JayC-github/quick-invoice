import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterInputSchema, LoginInputSchema } from "../models/user";
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  ErrorCodes,
} from "../middleware/error-handler";
import { put, get, queryGSI1, keys } from "../db/repository";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours
const BCRYPT_SALT_ROUNDS = 10;

export async function register(
  email: string,
  password: string
): Promise<{ userId: string; message: string }> {
  // Validate input
  const parsed = RegisterInputSchema.safeParse({ email, password });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path?.includes("password")) {
      throw new ValidationError(
        ErrorCodes.PASSWORD_TOO_SHORT,
        "Password must be at least 8 characters"
      );
    }
    throw new ValidationError(
      ErrorCodes.VALIDATION_ERROR,
      firstIssue?.message || "Invalid input"
    );
  }

  // Check if email already exists via GSI1
  const existingUsers = await queryGSI1(
    keys.gsi1.emailPk(email),
    keys.gsi1.emailSk()
  );
  if (existingUsers.length > 0) {
    throw new ConflictError(
      ErrorCodes.EMAIL_ALREADY_EXISTS,
      "An account with this email already exists"
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Create user record
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  await put({
    PK: keys.user.pk(userId),
    SK: keys.user.profile(),
    GSI1PK: keys.gsi1.emailPk(email),
    GSI1SK: keys.gsi1.emailSk(),
    userId,
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  return { userId, message: "Registration successful" };
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; expiresAt: number }> {
  // Validate input
  const parsed = LoginInputSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new AuthenticationError(
      ErrorCodes.AUTHENTICATION_FAILED,
      "Authentication failed"
    );
  }

  // Look up user by email via GSI1
  const users = await queryGSI1(
    keys.gsi1.emailPk(email),
    keys.gsi1.emailSk()
  );
  if (users.length === 0) {
    throw new AuthenticationError(
      ErrorCodes.AUTHENTICATION_FAILED,
      "Authentication failed"
    );
  }

  const user = users[0];
  const passwordHash = user.passwordHash as string;

  // Verify password
  const isValid = await bcrypt.compare(password, passwordHash);
  if (!isValid) {
    throw new AuthenticationError(
      ErrorCodes.AUTHENTICATION_FAILED,
      "Authentication failed"
    );
  }

  // Generate JWT
  const jti = crypto.randomUUID();
  const userId = user.userId as string;
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;

  const token = jwt.sign({ userId, jti }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY_SECONDS,
  });

  return { token, expiresAt };
}

export async function logout(token: string): Promise<{ message: string }> {
  // Decode the token to get JTI and userId
  const decoded = jwt.verify(token, JWT_SECRET) as {
    userId: string;
    jti: string;
    exp: number;
  };

  // Add token JTI to denylist with TTL matching token expiry
  await put({
    PK: keys.user.pk(decoded.userId),
    SK: keys.user.token(decoded.jti),
    denylisted: true,
    ttl: decoded.exp,
  });

  return { message: "Logout successful" };
}

export async function verifyToken(
  token: string
): Promise<{ userId: string }> {
  let decoded: { userId: string; jti: string; exp: number };

  try {
    decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      jti: string;
      exp: number;
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError(
        ErrorCodes.TOKEN_EXPIRED,
        "Token has expired"
      );
    }
    throw new AuthenticationError(
      ErrorCodes.TOKEN_INVALID,
      "Token is invalid"
    );
  }

  // Check denylist
  const denylistEntry = await get(
    keys.user.pk(decoded.userId),
    keys.user.token(decoded.jti)
  );
  if (denylistEntry) {
    throw new AuthenticationError(
      ErrorCodes.TOKEN_INVALID,
      "Token has been invalidated"
    );
  }

  return { userId: decoded.userId };
}
