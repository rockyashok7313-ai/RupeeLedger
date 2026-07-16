import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineChart, BarChart, FileText, Download } from 'lucide-react';
import { Invoice, Expense, Client, Transaction } from '@/lib/types';

interface Props {
  invoices?: Invoice[];
  expenses?: Expense[];
  clients?: Client[];
  transactions?: Transaction[];
  onEditInvoice?: (id: string) => void;
  onDeleteInvoice?: (id: string) => void;
}

export function ReportsView({ invoices = [], expenses = [], clients = [], transactions = [], onEditInvoice, onDeleteInvoice }: Props) {
  const [reportTab, setReportTab] = React.useState<'analytics' | 'tcs' | 'statement' | 'agent' | 'sales' | 'purchases'>('analytics');
  const [statementClientId, setStatementClientId] = React.useState('');
  const [agentLedgerId, setAgentLedgerId] = React.useState('');
  const stats = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    let totalRevenue = 0;
    let pendingReceivables = 0;
    let overdueCount = 0;
    

    const monthlyRevenue = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);
    
    // Client Analytics
    const clientSales: Record<string, number> = {};
    
    // Aging
    const aging = {
      '0_30': 0,
      '31_60': 0,
      '60_plus': 0
    };
    
    const now = new Date();

    invoices.forEach(inv => {
      const d = new Date(inv.date);
      if (d.getFullYear() === currentYear && inv.status !== 'draft') {
        totalRevenue += inv.total;
        monthlyRevenue[d.getMonth()] += inv.total;
        
        clientSales[inv.clientName] = (clientSales[inv.clientName] || 0) + inv.total;
      }

      if (inv.status === 'sent' || inv.status === 'overdue') {
        pendingReceivables += inv.total;
        
        const dueD = new Date(inv.dueDate);
        const diffDays = Math.floor((now.getTime() - dueD.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 0) {
          if (diffDays <= 30) aging['0_30'] += inv.total;
          else if (diffDays <= 60) aging['31_60'] += inv.total;
          else aging['60_plus'] += inv.total;
        }
      }

      if (inv.status === 'overdue') {
        overdueCount++;
      }
    });

    let totalExpenses = 0;
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      if (d.getFullYear() === currentYear) {
        totalExpenses += exp.amount;
        monthlyExpenses[d.getMonth()] += exp.amount;
      }
    });

    const topClients = Object.entries(clientSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const maxMonthRev = Math.max(...monthlyRevenue, ...monthlyExpenses, 1);

    return { totalRevenue, pendingReceivables, overdueCount, monthlyRevenue, monthlyExpenses, totalExpenses, topClients, aging, maxMonthRev };

  }, [invoices]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const tcsInvoices = invoices.filter(inv => inv.tcsAmount && inv.tcsAmount > 0);

  const partyStatement = React.useMemo(() => {
    if (!statementClientId) return [];
    
    const entries: { 
      id: string, date: number, description: string, debit: number, credit: number,
      invoiceNo?: string, quantity?: number | string, rate?: number | string, 
      taxableAmount?: number, cgst?: number, sgst?: number, igst?: number, invoiceId?: string
    }[] = [];
    
    // Sales
    invoices.filter(i => i.clientId === statementClientId).forEach(inv => {
      const totalQty = inv.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const rateStr = inv.items.length === 1 ? inv.items[0].rate : 'Multiple';
      
      entries.push({
        id: inv.id,
        invoiceId: inv.id,
        date: inv.date,
        invoiceNo: inv.invoiceNumber || inv.id.substring(0, 8),
        description: `Sale`,
        quantity: totalQty,
        rate: rateStr,
        taxableAmount: inv.subtotal,
        cgst: inv.cgst,
        sgst: inv.sgst,
        igst: inv.igst,
        debit: inv.total, // Client owes us
        credit: 0
      });
    });

    // Purchases (Expenses)
    expenses.filter(e => e.vendorId === statementClientId).forEach(exp => {
      entries.push({
        id: exp.id,
        date: exp.date,
        description: `Purchase/Bill`,
        debit: 0,
        credit: exp.amount // We owe vendor
      });
    });

    // Vendor Payments & Client Receipts (Transactions)
    transactions.filter(t => t.vendorId === statementClientId || t.accountId === statementClientId).forEach(t => {
      // If it's money received from client, it reduces their debit (so it's a credit to their ledger account)
      // Wait, in our simple system, if the transaction is 'Income' and linked to client, it's a receipt.
      // If it's 'Expense' and linked to vendor, it's a payment.
      let debit = 0;
      let credit = 0;
      
      if (t.type === 'Credit') {
        credit = t.amount; // Receipt from client
      } else {
        debit = t.amount; // Payment to vendor
      }

      entries.push({
        id: t.id,
        date: t.date,
        description: `Payment: ${t.description}`,
        debit,
        credit
      });
    });

    return entries.sort((a, b) => a.date - b.date);
  }, [statementClientId, invoices, expenses, transactions]);

  let runningBalance = 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2 flex-wrap">
        <Button variant={reportTab === 'analytics' ? 'default' : 'ghost'} onClick={() => setReportTab('analytics')}>Analytics</Button>
        <Button variant={reportTab === 'tcs' ? 'default' : 'ghost'} onClick={() => setReportTab('tcs')}>TCS Report</Button>
        <Button variant={reportTab === 'statement' ? 'default' : 'ghost'} onClick={() => setReportTab('statement')}>Party Statement</Button>
        <Button variant={reportTab === 'agent' ? 'default' : 'ghost'} onClick={() => setReportTab('agent')}>Agent Ledger</Button>
        <Button variant={reportTab === 'sales' ? 'default' : 'ghost'} onClick={() => setReportTab('sales')}>Sales Invoices</Button>
        <Button variant={reportTab === 'purchases' ? 'default' : 'ghost'} onClick={() => setReportTab('purchases')}>Purchase Invoices</Button>
      </div>

      {reportTab === 'analytics' && (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="premium-heading flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" /> Invoice Analytics & P&L
          </CardTitle>
          <CardDescription>Visual reports of your sales and revenue for {new Date().getFullYear()}</CardDescription>
        </CardHeader>
        <CardContent>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 border rounded-lg bg-emerald-50/50">
              <p className="text-sm font-medium text-emerald-800">Total Revenue</p>
              <h3 className="text-2xl font-bold text-emerald-900">₹{stats.totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-4 border rounded-lg bg-red-50/50">
              <p className="text-sm font-medium text-red-800">Total Expenses</p>
              <h3 className="text-2xl font-bold text-red-900">₹{stats.totalExpenses.toFixed(2)}</h3>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50/50">
              <p className="text-sm font-medium text-blue-800">Pending Receivables</p>
              <h3 className="text-2xl font-bold text-blue-900">₹{stats.pendingReceivables.toFixed(2)}</h3>
            </div>
            <div className="p-4 border rounded-lg bg-amber-50/50">
              <p className="text-sm font-medium text-amber-800">Net Profit</p>
              <h3 className="text-2xl font-bold text-amber-900">₹{(stats.totalRevenue - stats.totalExpenses).toFixed(2)}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart className="h-4 w-4" /> Monthly P&L (Revenue vs Expenses)
              </h3>
              <div className="h-64 rounded-md border p-4 flex items-end justify-between gap-2 bg-white">
                {stats.monthlyRevenue.map((rev, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full relative flex justify-center items-end h-full gap-1">
                      <div 
                        className="w-1/2 bg-blue-500/80 rounded-t-sm transition-all duration-300 group-hover:bg-blue-600"
                        title={`Revenue: ₹${rev.toFixed(0)}`}
                        style={{ height: `${(rev / stats.maxMonthRev) * 100}%`, minHeight: rev > 0 ? '4px' : '0' }}
                      />
                      <div 
                        className="w-1/2 bg-red-400/80 rounded-t-sm transition-all duration-300 group-hover:bg-red-500"
                        title={`Expense: ₹${stats.monthlyExpenses[i].toFixed(0)}`}
                        style={{ height: `${(stats.monthlyExpenses[i] / stats.maxMonthRev) * 100}%`, minHeight: stats.monthlyExpenses[i] > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-500 mt-2">{months[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Outstanding Aging</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-yellow-50 text-yellow-800 rounded">
                    <span>1 - 30 Days</span>
                    <span className="font-bold">₹{stats.aging['0_30'].toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-orange-50 text-orange-800 rounded">
                    <span>31 - 60 Days</span>
                    <span className="font-bold">₹{stats.aging['31_60'].toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-red-50 text-red-800 rounded">
                    <span>60+ Days</span>
                    <span className="font-bold">₹{stats.aging['60_plus'].toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Top Clients (YTD)</h3>
                <div className="space-y-2 text-sm">
                  {stats.topClients.length === 0 && <p className="text-gray-500 text-xs">No sales data yet.</p>}
                  {stats.topClients.map(([name, amount], idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 border rounded">
                      <span className="truncate w-32 font-medium" title={name}>{name}</span>
                      <span className="font-bold text-gray-700">₹{amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
      )}

      {reportTab === 'tcs' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="premium-heading">TCS Collection Report</CardTitle>
            <CardDescription>View all invoices where TCS was collected</CardDescription>
          </CardHeader>
          <CardContent>
            {tcsInvoices.length === 0 ? (
              <div className="text-center p-8 text-gray-500 border rounded">No TCS collected yet.</div>
            ) : (
              <table className="w-full text-sm text-left border rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Client</th>
                    <th className="p-3 text-right">Invoice Total</th>
                    <th className="p-3 text-right font-medium text-blue-600">TCS Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tcsInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.clientName}</td>
                      <td className="p-3 text-right">₹{inv.total.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium text-blue-600">₹{inv.tcsAmount?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {reportTab === 'statement' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="premium-heading">Party Statement</CardTitle>
            <CardDescription>View consolidated ledger for a client or vendor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Select Party</label>
              <select 
                className="flex h-10 w-full max-w-md items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={statementClientId}
                onChange={e => setStatementClientId(e.target.value)}
              >
                <option value="">-- Select Client / Vendor --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {statementClientId && partyStatement.length === 0 && (
              <div className="text-center p-8 text-gray-500 border rounded">No transactions found for this party.</div>
            )}

            {statementClientId && partyStatement.length > 0 && (
              <table className="w-full text-sm text-left border rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                    <th className="p-3 text-right">IGST</th>
                    <th className="p-3 text-right">Net Amount</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {partyStatement.map(entry => {
                    runningBalance += (entry.debit - entry.credit);
                    return (
                      <tr key={entry.id}>
                        <td className="p-3">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="p-3">
                          {entry.invoiceNo ? (
                            <button 
                              onClick={() => entry.invoiceId && onEditInvoice && onEditInvoice(entry.invoiceId)}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {entry.invoiceNo}
                            </button>
                          ) : entry.description}
                        </td>
                        <td className="p-3">{entry.quantity !== undefined ? entry.quantity : '-'}</td>
                        <td className="p-3">{entry.rate !== undefined ? entry.rate : '-'}</td>
                        <td className="p-3 text-right">{entry.taxableAmount !== undefined ? `₹${entry.taxableAmount.toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-right">{entry.cgst !== undefined ? `₹${entry.cgst.toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-right">{entry.sgst !== undefined ? `₹${entry.sgst.toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-right">{entry.igst !== undefined ? `₹${entry.igst.toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-right text-gray-900 font-medium">{entry.debit > 0 ? `₹${entry.debit.toFixed(2)} (Dr)` : entry.credit > 0 ? `₹${entry.credit.toFixed(2)} (Cr)` : '-'}</td>
                        <td className={`p-3 text-right font-medium ${runningBalance > 0 ? 'text-emerald-600' : runningBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          ₹{Math.abs(runningBalance).toFixed(2)} {runningBalance > 0 ? 'Dr' : runningBalance < 0 ? 'Cr' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {reportTab === 'agent' && (
        <Card className="glass-card mt-6">
          <CardHeader>
            <CardTitle className="premium-heading">Agent Ledger</CardTitle>
            <CardDescription>View commission earnings for an agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 max-w-md">
              <label className="text-sm font-medium mb-2 block">Select Agent</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={agentLedgerId}
                onChange={e => setAgentLedgerId(e.target.value)}
              >
                <option value="">-- Choose Agent --</option>
                {clients.filter(c => c.type === 'agent' || c.type === 'both').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {agentLedgerId && (
              <div className="space-y-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="p-3 font-medium text-gray-500">Date</th>
                      <th className="p-3 font-medium text-gray-500">Ref / Invoice No</th>
                      <th className="p-3 font-medium text-gray-500">Type</th>
                      <th className="p-3 font-medium text-gray-500 text-right">Debit (Paid)</th>
                      <th className="p-3 font-medium text-gray-500 text-right">Credit (Earned)</th>
                      <th className="p-3 font-medium text-gray-500 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const agentInvoices = invoices.filter(i => i.agentId === agentLedgerId && i.type === 'Tax Invoice' && i.agentCommissionAmount);
                      const agentPayments = expenses.filter(e => e.vendorId === agentLedgerId);
                      
                      const ledgerEntries = [
                        ...agentInvoices.map(inv => ({
                          id: inv.id,
                          date: inv.date,
                          ref: inv.invoiceNumber,
                          type: 'Commission Earned',
                          debit: 0,
                          credit: inv.agentCommissionAmount || 0,
                          details: `Taxable: ₹${inv.subtotal.toFixed(2)} @ ${inv.agentCommissionPercent}%`
                        })),
                        ...agentPayments.map(exp => ({
                          id: exp.id,
                          date: exp.date,
                          ref: exp.id.substring(0, 8),
                          type: 'Payment Made',
                          debit: exp.amount,
                          credit: 0,
                          details: exp.category
                        }))
                      ].sort((a, b) => a.date - b.date);

                      let runningBalance = 0;
                      let totalEarned = 0;
                      let totalPaid = 0;

                      return (
                        <>
                          {ledgerEntries.map(entry => {
                            runningBalance += (entry.credit - entry.debit);
                            totalEarned += entry.credit;
                            totalPaid += entry.debit;
                            
                            return (
                              <tr key={entry.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{new Date(entry.date).toLocaleDateString()}</td>
                                <td className="p-3 font-medium">
                                  {entry.ref}
                                  <div className="text-xs text-gray-400 font-normal">{entry.details}</div>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded-full text-xs ${entry.credit > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {entry.type}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-red-600">{entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}</td>
                                <td className="p-3 text-right text-emerald-600">{entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}</td>
                                <td className="p-3 text-right font-bold text-gray-700">₹{runningBalance.toFixed(2)} {runningBalance >= 0 ? '(Cr)' : '(Dr)'}</td>
                              </tr>
                            );
                          })}
                          {ledgerEntries.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No transactions found for this agent.</td></tr>
                          )}
                          <tr className="bg-gray-100 border-t-2 border-gray-200">
                            <td colSpan={3} className="p-3 text-right font-bold text-gray-700">Totals</td>
                            <td className="p-3 text-right font-bold text-red-700">₹{totalPaid.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-emerald-700">₹{totalEarned.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-gray-900 text-lg">₹{runningBalance.toFixed(2)} {runningBalance >= 0 ? 'Cr' : 'Dr'}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportTab === 'sales' && (
        <Card className="glass-card mt-6">
          <CardHeader>
            <CardTitle className="premium-heading">Sales Invoices</CardTitle>
            <CardDescription>Manage all your sales invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center p-8 text-gray-500 border rounded">No sales invoices found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Invoice No</th>
                      <th className="p-3">Client</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.sort((a, b) => b.date - a.date).map(inv => (
                      <tr key={inv.id}>
                        <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="p-3">{inv.clientName}</td>
                        <td className="p-3 text-right">₹{inv.total.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {onEditInvoice && (
                            <Button variant="ghost" size="sm" onClick={() => onEditInvoice(inv.id)} className="text-blue-600">
                              Edit
                            </Button>
                          )}
                          {onDeleteInvoice && (
                            <Button variant="ghost" size="sm" onClick={() => onDeleteInvoice(inv.id)} className="text-red-600">
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportTab === 'purchases' && (
        <Card className="glass-card mt-6">
          <CardHeader>
            <CardTitle className="premium-heading">Purchase Invoices (Expenses)</CardTitle>
            <CardDescription>Manage all your purchase bills and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center p-8 text-gray-500 border rounded">No purchase invoices found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Vendor</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.sort((a, b) => b.date - a.date).map(exp => {
                      const vendor = clients.find(c => c.id === exp.vendorId);
                      return (
                        <tr key={exp.id}>
                          <td className="p-3">{new Date(exp.date).toLocaleDateString()}</td>
                          <td className="p-3">{exp.category}</td>
                          <td className="p-3">{vendor ? vendor.name : 'Unknown'}</td>
                          <td className="p-3 text-right">₹{exp.amount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
