import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert cents (integer) → formatted currency string */
export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Convert dollars (float from form input) → cents (integer) */
export function toCents(dollars: string | number): number {
  return Math.round(Number(dollars) * 100);
}

/** Convert cents → dollar string for inputs */
export function toDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format a Date or ISO string → "Jan 2024" */
export function formatMonthYear(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/** Format a Date or ISO string → "Jan 15, 2024" */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

/** Returns "YYYY-MM" for a given Date */
export function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
