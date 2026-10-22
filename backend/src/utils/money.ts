/**
 * Money helpers — all amounts stored as integers (cents) in MongoDB
 * to avoid IEEE 754 floating-point rounding errors.
 */

/**
 * Convert dollars (float) → cents (integer).
 * e.g. 19.99 → 1999
 */
export const toCents = (dollars: number): number =>
  Math.round(dollars * 100);

/**
 * Convert cents (integer) → dollars (float).
 * e.g. 1999 → 19.99
 */
export const toDollars = (cents: number): number =>
  cents / 100;

/**
 * Format cents as a currency string.
 * e.g. 1999 → "$19.99"
 */
export const formatCurrency = (
  cents: number,
  currency = "USD",
  locale = "en-US"
): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(toDollars(cents));

/**
 * Safe parse — returns 0 if the value is not a valid positive number.
 */
export const safeParseCents = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};
