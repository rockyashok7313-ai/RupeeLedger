import React, { useState, useMemo } from 'react';
import { Transaction, Account } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, Scale, Building2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface AccountingReportsProps {
  transactions: Transaction[];
  accounts: Account[];
}

export const AccountingReports: React.FC<AccountingReportsProps> = ({ transactions, accounts }) => {
  const [activeTab, setActiveTab] = useState("cashbook");

  // Cash Book Logic
  const cashAccounts = useMemo(() => accounts.filter(a => a.type === 'Cash' || a.type === 'Bank'), [accounts]);
  const cashTransactions = useMemo(() => {
    const cashAccIds = cashAccounts.map(a => a.id);
    return transactions.filter(t => cashAccIds.includes(t.accountId)).sort((a, b) => b.date - a.date);
  }, [transactions, cashAccounts]);

  const totalCashBalance = useMemo(() => cashAccounts.reduce((sum, a) => sum + a.currentBalance, 0), [cashAccounts]);

  // Trial Balance Logic (simplified)
  const trialBalance = useMemo(() => {
    return accounts.map(acc => {
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: acc.currentBalance
      };
    }).sort((a, b) => b.balance - a.balance);
  }, [accounts]);

  const totalDebits = trialBalance.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
  const totalCredits = trialBalance.filter(a => a.balance < 0).reduce((sum, a) => sum + Math.abs(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Accounting</h2>
          <p className="text-muted-foreground mt-1">Cash book, trial balance, and profit & loss statements.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="cashbook" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Cash Book
          </TabsTrigger>
          <TabsTrigger value="trial" className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Trial Balance
          </TabsTrigger>
          <TabsTrigger value="pnl" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="bs" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Balance Sheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cashbook" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Cash Book</CardTitle>
                <CardDescription>All transactions flowing through Cash and Bank accounts.</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground font-medium">Closing Balance</p>
                <p className="text-2xl font-bold text-green-600">₹{totalCashBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto mt-4">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Account</th>
                      <th className="px-4 py-3 font-medium text-right text-green-600">In (Credit)</th>
                      <th className="px-4 py-3 font-medium text-right text-red-600">Out (Debit)</th>
                      <th className="px-4 py-3 font-medium text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cashTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No cash or bank transactions found.
                        </td>
                      </tr>
                    ) : (
                      cashTransactions.map((t) => {
                        const acc = cashAccounts.find(a => a.id === t.accountId);
                        return (
                          <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">{format(new Date(t.date), 'dd MMM yyyy')}</td>
                            <td className="px-4 py-3">{t.description}</td>
                            <td className="px-4 py-3 font-medium">
                              <Badge variant="outline">{acc?.name || 'Unknown'}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">
                              {t.type === 'Credit' ? `+ ₹${t.amount.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600 font-medium">
                              {t.type === 'Debit' ? `- ₹${t.amount.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">₹{t.balanceAfter.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trial" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Trial Balance</CardTitle>
                <CardDescription>Summary of all ledger balances to verify double-entry accounting.</CardDescription>
              </div>
              <div className="flex items-center gap-8 text-right">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Dr (Assets/Expenses)</p>
                  <p className="text-xl font-bold">₹{totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Cr (Liabilities/Income)</p>
                  <p className="text-xl font-bold">₹{totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto mt-4">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ledger Account</th>
                      <th className="px-4 py-3 font-medium">Group / Type</th>
                      <th className="px-4 py-3 font-medium text-right">Debit (Dr)</th>
                      <th className="px-4 py-3 font-medium text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trialBalance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No accounts found.
                        </td>
                      </tr>
                    ) : (
                      trialBalance.map((acc) => (
                        <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{acc.name}</td>
                          <td className="px-4 py-3"><Badge variant="secondary">{acc.type}</Badge></td>
                          <td className="px-4 py-3 text-right text-blue-700">
                            {acc.balance > 0 ? `₹${acc.balance.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-700">
                            {acc.balance < 0 ? `₹${Math.abs(acc.balance).toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t font-bold">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">Grand Total:</td>
                      <td className="px-4 py-3 text-right text-blue-800">₹{totalDebits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-amber-800">₹{totalCredits.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {Math.abs(totalDebits - totalCredits) > 1 && (
                <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <strong>Warning:</strong> Trial balance is not tallying. Difference of ₹{Math.abs(totalDebits - totalCredits).toLocaleString()}. Check manual ledger entries.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Account</CardTitle>
              <CardDescription>Statement of financial performance (Coming soon in Phase 5.2).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p>P&L extraction from invoices and expenses is being built.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bs" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>Statement of financial position (Coming soon in Phase 5.3).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p>Balance sheet generation requires closing stock valuation.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
