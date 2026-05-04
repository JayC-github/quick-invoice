/**
 * Format a value in cents as a currency string.
 * Example: 15099 → "$150.99"
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Convert cents to a dollar number for display in form inputs.
 * Example: 15099 → 150.99
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Convert a dollar amount to cents for API submission.
 * Rounds to the nearest integer to avoid floating-point drift.
 * Example: 150.99 → 15099
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}
