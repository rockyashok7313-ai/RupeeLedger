import type { Expense } from './types.ts';

export const EXPENSE_CATEGORIES = ['General', 'Office supplies', 'Rent & utilities', 'Travel', 'Meals', 'Software', 'Professional services', 'Marketing', 'Repairs', 'Purchases'];
export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value);
export function dateKey(value: number | Date): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const expenseTax = (e: Expense) => (e.cgst || 0) + (e.sgst || 0) + (e.igst || 0);
// Display summaries only. Source records and their precision are never rewritten.
export const sumMoney = (values: number[]) => values.reduce((total, n) => total + Math.round(n * 100), 0) / 100;

export type ExpenseFilters = { query: string; category: string; from: string; to: string; reviewOnly: boolean; sort: 'newest' | 'oldest' | 'highest' | 'lowest' };
export function duplicateIds(expenses: Expense[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const e of expenses) {
    const key = JSON.stringify([e.vendorName.trim().toLowerCase(), dateKey(e.date), e.amount, e.cgst, e.sgst, e.igst]);
    groups.set(key, [...(groups.get(key) || []), e.id]);
  }
  return new Set([...groups.values()].filter(ids => ids.length > 1).flat());
}
export function filterExpenses(expenses: Expense[], filters: ExpenseFilters, duplicates = duplicateIds(expenses)): Expense[] {
  const query = filters.query.trim().toLowerCase();
  return expenses.filter(e => {
    const date = dateKey(e.date);
    return (!query || `${e.vendorName} ${e.category} ${e.gstin}`.toLowerCase().includes(query)) &&
      (!filters.category || e.category === filters.category) &&
      (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to) &&
      (!filters.reviewOnly || duplicates.has(e.id));
  }).sort((a, b) => {
    const primary = filters.sort === 'highest' ? b.amount - a.amount : filters.sort === 'lowest' ? a.amount - b.amount : filters.sort === 'oldest' ? a.date - b.date : b.date - a.date;
    return primary || a.id.localeCompare(b.id);
  });
}

export type ExpenseDraft = { vendorName: string; gstin: string; date: string; category: string; amount: string; cgst: string; sgst: string; igst: string };
export function validateExpenseDraft(draft: ExpenseDraft): string | null {
  if (!draft.vendorName.trim()) return 'Enter a vendor name.';
  if (draft.vendorName.trim().length > 200 || draft.category.trim().length > 100) return 'Use a shorter vendor name or category.';
  const date = new Date(`${draft.date}T12:00:00`);
  if (!draft.date || !Number.isFinite(date.getTime()) || dateKey(date) !== draft.date) return 'Choose a valid expense date.';
  for (const key of ['amount', 'cgst', 'sgst', 'igst'] as const) {
    const text = draft[key].trim();
    if (key === 'amount' && !text) return 'Enter an expense amount.';
    const value = Number(text || '0');
    if (!Number.isFinite(value) || value < 0 || value > 999999999999 || (key === 'amount' && value === 0)) return 'Enter a positive expense amount and non-negative GST amounts.';
  }
  if (draft.gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(draft.gstin.trim().toUpperCase())) return 'GSTIN must contain 15 letters and digits, starting with a two-digit state code.';
  return null;
}

// Spreadsheet formula injection protection applies to text; raw numeric precision is retained.
export function expenseCsv(expenses: Expense[]): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = expenses.map(e => [e.id, dateKey(e.date), e.vendorName, e.category, e.gstin, e.amount, e.cgst, e.sgst, e.igst]);
  return '\uFEFF' + [['ID', 'Date', 'Vendor', 'Category', 'GSTIN', 'Recorded amount (INR)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)'], ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}
