import { createPortal } from 'react-dom';
import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Download, Printer, Pencil, Trash2, Receipt, ArrowUpRight, ChevronLeft, ChevronRight, X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Expense } from '@/lib/types';
import { EXPENSE_CATEGORIES, dateKey, duplicateIds, expenseCsv, expenseTax, filterExpenses, money, sumMoney, validateExpenseDraft, type ExpenseDraft, type ExpenseFilters } from '@/lib/expenses';
import './expenses.css';

export interface ExpenseTrackerProps {
  expenses?: Expense[];
  setExpenses?: (expenses: Expense[]) => void;
  onSave?: (expense: Expense, original?: Expense) => Promise<void>;
  onDelete?: (expense: Expense) => Promise<void>;
  businessName?: string;
  storageLabel?: string;
}
const blankDraft = (): ExpenseDraft => ({ vendorName: '', gstin: '', date: dateKey(new Date()), category: 'General', amount: '', cgst: '', sgst: '', igst: '' });
const defaultFilters: ExpenseFilters = { query: '', category: '', from: '', to: '', reviewOnly: false, sort: 'newest' };
const dateLabel = (date: number) => Number.isFinite(new Date(date).getTime()) ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : 'Date unavailable';
const PAGE_SIZE = 15;

export function ExpenseTracker({ expenses = [], setExpenses, onSave, onDelete, businessName = 'RupeeLedger', storageLabel = 'Saved on this device' }: ExpenseTrackerProps) {
  const [filters, setFilters] = useState<ExpenseFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ original?: Expense; id: string } | null>(null);
  const [draft, setDraft] = useState<ExpenseDraft>(blankDraft);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [initialDraft, setInitialDraft] = useState('');
  const duplicates = useMemo(() => duplicateIds(expenses), [expenses]);
  const filtered = useMemo(() => filterExpenses(expenses, filters, duplicates), [expenses, filters, duplicates]);
  const categories = useMemo(() => [...new Set([...EXPENSE_CATEGORIES, ...expenses.map(e => e.category).filter(Boolean)])].sort(), [expenses]);
  const total = sumMoney(filtered.map(e => e.amount));
  const tax = sumMoney(filtered.map(expenseTax));
  const vendorCount = new Set(filtered.map(e => e.vendorName.trim().toLowerCase())).size;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const breakdown = useMemo(() => {
    const grouped = new Map<string, number[]>();
    filtered.forEach(e => grouped.set(e.category || 'General', [...(grouped.get(e.category || 'General') || []), e.amount]));
    return [...grouped].map(([name, amounts]) => ({ name, total: sumMoney(amounts) })).sort((a, b) => b.total - a.total);
  }, [filtered]);
  const monthly = useMemo(() => {
    const groups = new Map<string, number[]>();
    filtered.forEach(e => { const key = dateKey(e.date).slice(0, 7); if (key) groups.set(key, [...(groups.get(key) || []), e.amount]); });
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, values]) => ({ month, total: sumMoney(values) }));
  }, [filtered]);
  const hasFilters = filters.query || filters.category || filters.from || filters.to || filters.reviewOnly;
  const period = filters.from || filters.to ? `${filters.from || 'Beginning'} to ${filters.to || 'Latest'}` : 'All dates';
  const writable = Boolean(onSave || setExpenses);
  const patchFilters = (patch: Partial<ExpenseFilters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };
  const openEditor = (original?: Expense) => {
    const next = original ? { vendorName: original.vendorName, gstin: original.gstin || '', date: dateKey(original.date), category: original.category, amount: String(original.amount), cgst: String(original.cgst), sgst: String(original.sgst), igst: String(original.igst) } : blankDraft();
    setDraft(next); setInitialDraft(JSON.stringify(next)); setEditor({ original, id: original?.id || crypto.randomUUID() }); setError(''); setDuplicateConfirmed(false); setDiscard(false);
  };
  const closeEditor = () => { if (!busy) { if (JSON.stringify(draft) !== initialDraft) setDiscard(true); else setEditor(null); } };
  const updateDraft = (key: keyof ExpenseDraft, value: string) => { setDraft(d => ({ ...d, [key]: value })); setDuplicateConfirmed(false); setError(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!editor || busy) return;
    const validation = validateExpenseDraft(draft);
    if (validation) { setError(validation); return; }
    const candidate: Expense = {
      ...editor.original, id: editor.id, createdAt: editor.original?.createdAt ?? Date.now(),
      vendorName: draft.vendorName.trim(), gstin: draft.gstin.trim().toUpperCase(), category: draft.category.trim() || 'General',
      date: editor.original && dateKey(editor.original.date) === draft.date ? editor.original.date : new Date(`${draft.date}T12:00:00`).getTime(),
      amount: Number(draft.amount), cgst: Number(draft.cgst || 0), sgst: Number(draft.sgst || 0), igst: Number(draft.igst || 0),
    };
    if (!duplicateConfirmed && duplicateIds([...expenses.filter(e => e.id !== candidate.id), candidate]).has(candidate.id)) { setError('Another expense has the same vendor, date, amount and GST. Confirm below if this is a separate purchase.'); return; }
    setBusy(true); setError('');
    try {
      if (onSave) await onSave(candidate, editor.original);
      else setExpenses?.(editor.original ? expenses.map(e => e.id === candidate.id ? candidate : e) : [...expenses, candidate]);
      setNotice(`${editor.original ? 'Updated' : 'Added'} expense for ${candidate.vendorName}.`); setEditor(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Expense could not be saved. Your draft is still here.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || busy) return; setBusy(true); setError('');
    try { if (onDelete) await onDelete(deleting); else setExpenses?.(expenses.filter(e => e.id !== deleting.id)); setNotice(`Deleted expense for ${deleting.vendorName}.`); setDeleting(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Expense could not be deleted. Please retry.'); }
    finally { setBusy(false); }
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([expenseCsv(filtered)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `expenses-${dateKey(new Date())}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} expenses.`);
  };
  const choosePeriod = (value: string) => {
    const now = new Date(); if (value === 'all') { patchFilters({ from: '', to: '' }); return; }
    const start = value === 'last' ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : value === 'fy' ? new Date(now.getFullYear() - (now.getMonth() < 3 ? 1 : 0), 3, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
    patchFilters({ from: dateKey(start), to: dateKey(value === 'last' ? new Date(now.getFullYear(), now.getMonth(), 0) : now) });
  };
  return <section className="expense-workspace" aria-label="Expense workspace"><div className="expense-screen">
    <header className="expense-heading"><div><p className="expense-eyebrow">BUSINESS / EXPENSES</p><h2>Know where every rupee goes.</h2><p className="text-muted-foreground text-sm mt-2">Capture purchases. Understand spending. Keep better records.</p></div><Button onClick={() => openEditor()} disabled={!writable} className="expense-add"><Plus className="h-4 w-4 mr-2" />Add expense</Button></header>
    <div className="expense-toolbar-top"><span className="text-xs text-muted-foreground">{storageLabel}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!filtered.length} onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button><Button variant="outline" size="sm" disabled={!filtered.length} onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print report</Button></div></div>
    {notice && <div role="status" className="expense-notice"><Check className="h-4 w-4" />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')} className="ml-auto"><X className="h-4 w-4" /></button></div>}
    <div className="expense-stats"><article className="expense-total"><span className="expense-stat-label">Recorded expenses</span><strong data-testid="expense-total">{money(total)}</strong><span className="expense-stat-foot">{period}<ArrowUpRight className="h-5 w-5" /></span></article><article className="expense-stat"><span className="expense-stat-label">GST recorded</span><strong>{money(tax)}</strong><span className="expense-stat-foot">CGST + SGST + IGST</span></article><article className="expense-stat"><span className="expense-stat-label">Expense entries</span><strong>{filtered.length.toLocaleString('en-IN')}</strong><span className="expense-stat-foot">Across {vendorCount} vendors</span></article><article className="expense-stat"><span className="expense-stat-label">Average expense</span><strong>{money(filtered.length ? total / filtered.length : 0)}</strong><span className="expense-stat-foot">For the current selection</span></article></div>
    <div className="expense-main-grid"><div className="expense-register">
      <div className="expense-section-heading"><h3>Expense register <span className="expense-count">{filtered.length}</span></h3><p>Every entry, in one place.</p></div>
      <div className="expense-filters"><div className="expense-search"><Search className="h-4 w-4" /><Input aria-label="Search expenses" placeholder="Search vendor, category or GSTIN" value={filters.query} onChange={e => patchFilters({ query: e.target.value })} /></div><select aria-label="Filter by category" value={filters.category} onChange={e => patchFilters({ category: e.target.value })}><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select><select aria-label="Sort expenses" value={filters.sort} onChange={e => patchFilters({ sort: e.target.value as ExpenseFilters['sort'] })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></div>
      <div className="expense-dates"><select aria-label="Date preset" value="" onChange={e => choosePeriod(e.target.value)}><option value="" disabled>Date range</option><option value="all">All dates</option><option value="month">This month</option><option value="last">Last month</option><option value="fy">Financial year to date</option></select><label>From<Input aria-label="From date" type="date" value={filters.from} max={filters.to || undefined} onChange={e => patchFilters({ from: e.target.value })} /></label><label>To<Input aria-label="To date" type="date" value={filters.to} min={filters.from || undefined} onChange={e => patchFilters({ to: e.target.value })} /></label>{hasFilters && <Button variant="ghost" size="sm" onClick={() => { setFilters(defaultFilters); setPage(1); }}><X className="h-3 w-3 mr-1" />Clear</Button>}</div>
      {filters.from && filters.to && filters.from > filters.to && <p role="alert" className="px-5 py-2 text-sm text-destructive">The start date must be before the end date.</p>}
      {!filtered.length ? <div className="expense-empty"><Receipt className="h-9 w-9 text-muted-foreground" /><h4>{expenses.length ? 'No expenses match these filters' : 'Your first expense starts here'}</h4><p>{expenses.length ? 'Try another vendor, category or date range.' : 'Add a business purchase to start building your expense register.'}</p><Button variant="outline" onClick={() => expenses.length ? (setFilters(defaultFilters), setPage(1)) : openEditor()} disabled={!expenses.length && !writable}>{expenses.length ? 'Clear filters' : 'Add your first expense'}</Button></div> : <><div className="expense-table-scroll"><table className="expense-table"><thead><tr><th>Vendor / category</th><th>Date</th><th className="text-right">Recorded amount</th><th className="text-right">GST</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(e => <tr key={e.id}><td><div className="expense-vendor"><span className="expense-vendor-mark" aria-hidden>{e.vendorName.slice(0, 2).toUpperCase()}</span><div><span className="font-semibold">{e.vendorName}</span>{duplicates.has(e.id) && <span className="expense-review-badge" title="Same vendor, date, amount and GST as another entry">Review</span>}<span className="expense-category">{e.category || 'General'}</span></div></div></td><td className="whitespace-nowrap text-muted-foreground">{dateLabel(e.date)}</td><td className="expense-number font-semibold">{money(e.amount)}</td><td className="expense-number text-muted-foreground">{money(expenseTax(e))}</td><td><div className="flex gap-1 justify-end"><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit expense from ${e.vendorName}`} disabled={!writable} onClick={() => openEditor(e)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete expense from ${e.vendorName}`} disabled={!writable} onClick={() => { setDeleting(e); setError(''); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></div><footer className="expense-pagination"><span>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} expenses</span><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous page" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button><span>{currentPage} / {pageCount}</span><Button variant="outline" size="icon" aria-label="Next page" className="h-8 w-8" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button></div></footer></>}
    </div><aside className="expense-insights" aria-label="Spending insights"><section className="expense-insight-card"><p className="expense-eyebrow">SPENDING MIX</p><h3>Where it goes</h3>{breakdown.length ? <div className="expense-breakdown">{breakdown.slice(0, 5).map((c, i) => <button key={c.name} onClick={() => patchFilters({ category: c.name })} aria-label={`Show ${c.name} expenses`}><span><span className="truncate">{c.name}</span><b>{money(c.total)}</b></span><span className="expense-track"><span style={{ width: `${Math.max(0, Math.min(100, total > 0 ? c.total / total * 100 : 0))}%`, opacity: 1 - i * 0.13 }} /></span></button>)}{breakdown.length > 5 && <p className="text-xs text-muted-foreground">Top 5 of {breakdown.length} categories</p>}</div> : <p className="expense-insight-empty">Your category breakdown will appear here.</p>}</section>
      <section className="expense-insight-card"><p className="expense-eyebrow">MONTHLY VIEW</p><h3>Spending over time</h3>{monthly.length ? <div className="expense-bars" role="img" aria-label={monthly.map(m => `${m.month}: ${money(m.total)}`).join('; ')}>{monthly.map(m => <div key={m.month} title={`${m.month}: ${money(m.total)}`}><span className="expense-bar"><span style={{ height: `${Math.max(2, m.total / Math.max(...monthly.map(x => x.total), 1) * 100)}%` }} /></span><span>{new Date(`${m.month}-15T12:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span><small>{m.month.slice(0, 4)}</small></div>)}</div> : <p className="expense-insight-empty">Add expenses to see your monthly pattern.</p>}<p className="text-xs text-muted-foreground mt-3">Latest six recorded months in this selection.</p></section>
      <section className="expense-review-card"><div className="flex gap-2 items-center"><AlertTriangle className="h-4 w-4" /><h3>Review duplicates</h3></div><p>{duplicates.size ? `${duplicates.size} entries share a vendor, date, amount and GST. Review them before making changes.` : 'No matching duplicate entries found in your current records.'}</p>{duplicates.size > 0 && <Button variant="outline" size="sm" onClick={() => patchFilters({ ...defaultFilters, reviewOnly: true })}>Review {duplicates.size} entries<ArrowUpRight className="ml-2 h-3 w-3" /></Button>}</section></aside></div>
    <p className="expense-footnote">Amounts follow your saved expense records. GST is shown separately; no tax is added to or deducted from the recorded amount. Recorded GST is not a determination of input tax credit eligibility.</p>
  </div>
  {createPortal(<div className="expense-print"><p>{businessName}</p><h1>Expense register</h1><p>{period} · {filters.category || 'All categories'}{filters.query ? ` · Search: ${filters.query}` : ''}{filters.reviewOnly ? ' · Possible duplicates' : ''}</p><p>{filtered.length} entries · Recorded amount {money(total)} · GST {money(tax)}</p><table><thead><tr><th>Date</th><th>Vendor / GSTIN</th><th>Category</th><th>Amount</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead><tbody>{filtered.map(e => <tr key={e.id}><td>{dateLabel(e.date)}</td><td>{e.vendorName}<br /><small>{e.gstin}</small></td><td>{e.category}</td><td>{money(e.amount)}</td><td>{money(e.cgst)}</td><td>{money(e.sgst)}</td><td>{money(e.igst)}</td></tr>)}</tbody></table><p>Amounts and GST are reported separately as recorded. Generated {dateLabel(Date.now())}.</p></div>, document.body)}
  <Dialog open={!!editor} onOpenChange={open => { if (!open) closeEditor(); }}><DialogContent className="expense-dialog max-w-2xl"><DialogHeader><p className="expense-eyebrow">EXPENSE REGISTER</p><DialogTitle className="font-headline text-2xl">{editor?.original ? 'Edit expense' : 'Add an expense'}</DialogTitle><DialogDescription>Record the purchase exactly as it appears on your bill.</DialogDescription></DialogHeader><form onSubmit={save} className="expense-form"><div className="expense-form-grid">
    <label className="sm:col-span-2">Vendor name *<Input autoFocus required maxLength={200} value={draft.vendorName} onChange={e => updateDraft('vendorName', e.target.value)} placeholder="e.g. Metro Office Supplies" list="expense-vendors" /></label><datalist id="expense-vendors">{[...new Set(expenses.map(e => e.vendorName))].map(v => <option key={v}>{v}</option>)}</datalist><label>Date *<Input type="date" required value={draft.date} onChange={e => updateDraft('date', e.target.value)} /></label><label>Category<Input list="expense-categories" maxLength={100} value={draft.category} onChange={e => updateDraft('category', e.target.value)} /></label><datalist id="expense-categories">{categories.map(c => <option key={c}>{c}</option>)}</datalist><label>Recorded amount (₹) *<Input type="number" inputMode="decimal" step="any" min="0.000001" required value={draft.amount} onChange={e => updateDraft('amount', e.target.value)} placeholder="0.00" /></label><label>Vendor GSTIN (optional)<Input maxLength={15} value={draft.gstin} onChange={e => updateDraft('gstin', e.target.value.toUpperCase())} placeholder="15-character GSTIN" /></label>
  </div><fieldset className="expense-tax-fields"><legend>GST recorded on the bill</legend><p>Enter tax amounts separately. Your recorded amount will stay as entered.</p><div className="grid grid-cols-3 gap-3">{(['cgst', 'sgst', 'igst'] as const).map(key => <label key={key}>{key.toUpperCase()} (₹)<Input type="number" inputMode="decimal" min="0" step="any" value={draft[key]} onChange={e => updateDraft(key, e.target.value)} placeholder="0.00" /></label>)}</div></fieldset>
  {error && <div className="expense-form-error" role="alert">{error}</div>}{error.startsWith('Another expense') && <label className="mt-3"><input type="checkbox" checked={duplicateConfirmed} onChange={e => setDuplicateConfirmed(e.target.checked)} /> This is a separate purchase; keep both entries.</label>}{discard && <div className="expense-form-error"><p>Discard the unsaved changes?</p><div className="flex gap-2 mt-2"><Button type="button" variant="outline" size="sm" onClick={() => setDiscard(false)}>Keep editing</Button><Button type="button" variant="destructive" size="sm" onClick={() => setEditor(null)}>Discard changes</Button></div></div>}<div className="expense-form-footer"><span>{storageLabel}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={closeEditor}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{busy ? 'Saving…' : 'Save expense'}</Button></div></div></form></DialogContent></Dialog>
  <Dialog open={!!deleting} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete this expense?</DialogTitle><DialogDescription>{deleting?.vendorName} · {money(deleting?.amount || 0)}. This removes the expense from your register and reports. This cannot be undone here.</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Keep expense</Button><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete expense'}</Button></div></DialogContent></Dialog>
  </section>;
}
