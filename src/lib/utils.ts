import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { isValid, parse } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Reads a date from whatever the ledger happens to hold: a millisecond or
 * second timestamp, an ISO string, a Date, or a hand-typed string using any of
 * `-`, `/` or `.` as the separator.
 *
 * Day-first formats are tried before month-first, so `03-04-2026` reads as
 * 3 April, which is what an Indian ledger means by it. Anything outside
 * 1970-2099 is rejected rather than returned, since a parse that lands there
 * is a misread rather than a real entry.
 *
 * Returns null when nothing parses, so callers decide what to show instead of
 * rendering "Invalid Date".
 */
export function parseFlexibleDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return isValid(input) ? input : null;

  if (typeof input === 'number') {
    const d = new Date(input);
    return isValid(d) ? d : null;
  }

  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Bare timestamp. Ten digits is seconds, thirteen is milliseconds.
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = Number(trimmed);
    const d = new Date(num > 10000000000 ? num : num * 1000);
    if (isValid(d)) return d;
  }

  // ISO, e.g. 2026-09-12T10:30:00Z
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (isValid(d)) return d;
  }

  const normalized = trimmed.replace(/[/.]/g, '-');

  const inRange = (d: Date) => isValid(d) && d.getFullYear() >= 1970 && d.getFullYear() <= 2099;

  // Order matters: day-first before month-first.
  const supportedFormats = [
    'dd-MM-yyyy',
    'd-M-yyyy',
    'd-MM-yyyy',
    'dd-M-yyyy',
    'yyyy-MM-dd',
    'yyyy-M-d',
    'yyyy-M-dd',
    'yyyy-MM-d',
    'dd-MM-yy',
    'd-M-yy',
    'MM-dd-yyyy',
    'M-d-yyyy',
  ];

  for (const fmt of supportedFormats) {
    try {
      const parsed = parse(normalized, fmt, new Date());
      if (inRange(parsed)) return parsed;
    } catch {
      // Try the next format.
    }
  }

  try {
    const fallback = new Date(trimmed);
    if (inRange(fallback)) return fallback;
  } catch {
    // Fall through to null.
  }

  return null;
}
