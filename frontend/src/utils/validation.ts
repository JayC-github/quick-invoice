export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an email address.
 * Checks for non-empty value and a basic email pattern.
 */
export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { valid: false, error: 'Email is required' };
  }
  // Basic email pattern: something@something.something
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
}

/**
 * Validate a password.
 * Must be at least 8 characters long.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

/**
 * Validate that a required field is not empty.
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

/**
 * Validate that the due date is on or after the issue date.
 */
export function validateDateRange(issueDate: string, dueDate: string): ValidationResult {
  if (!issueDate) {
    return { valid: false, error: 'Issue date is required' };
  }
  if (!dueDate) {
    return { valid: false, error: 'Due date is required' };
  }
  if (dueDate < issueDate) {
    return { valid: false, error: 'Due date must be on or after the issue date' };
  }
  return { valid: true };
}

/**
 * Validate an array of line items.
 * Requires at least one item, each with a non-empty description,
 * a positive quantity, and a non-negative unit price.
 */
export function validateLineItems(
  items: { description: string; quantity: number; unitPrice: number }[],
): ValidationResult {
  if (!items || items.length === 0) {
    return { valid: false, error: 'At least one line item is required' };
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.description.trim()) {
      return { valid: false, error: `Line item ${i + 1}: description is required` };
    }
    if (item.quantity <= 0) {
      return { valid: false, error: `Line item ${i + 1}: quantity must be positive` };
    }
    if (item.unitPrice < 0) {
      return { valid: false, error: `Line item ${i + 1}: unit price must be non-negative` };
    }
  }
  return { valid: true };
}
