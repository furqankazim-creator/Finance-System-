export function formatCents(cents: number | undefined | null, currency = 'PKR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollarsInput(cents: number | undefined | null): string {
  return ((cents ?? 0) / 100).toFixed(2);
}

// Compact axis-tick label: cents -> currency units, "k" only once the
// magnitude actually calls for it (avoids "PKR 0k" for small chart values).
export function formatCentsCompact(cents: number | undefined | null, currency = 'PKR'): string {
  const units = (cents ?? 0) / 100;
  if (Math.abs(units) >= 1000) {
    return `${currency} ${Math.round(units / 1000)}k`;
  }
  return `${currency} ${Math.round(units)}`;
}
