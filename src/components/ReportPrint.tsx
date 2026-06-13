import React from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, Download } from 'lucide-react';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

export function ReportPrint({ account, transactions }: { account: Account; transactions: Transaction[] }) {
  const handlePrint = () => {
    window.print();
  };

  // Sort ascending (chronological) for professional statements
  const sortedTransactions = [...transactions].sort((a, b) => a.date - b.date);

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'Credit') acc.credit += t.amount;
    else acc.debit += t.amount;
    return acc;
  }, { credit: 0, debit: 0 });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 no-print">
        <Button onClick={handlePrint} className="flex-1 sm:flex-none">
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </Button>
        <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none">
          <Download className="mr-2 h-4 w-4" /> Save as PDF
        </Button>
      </div>

      <div className="print-only p-8 bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">RupeeLedger</h1>
            <p className="text-sm text-muted-foreground mt-1">Transaction Statement</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase">{account.name}</h2>
            <p className="text-sm">Account Type: {account.type}</p>
            <p className="text-xs text-muted-foreground mt-1">Generated on: {format(new Date(), 'PPP p')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Opening Balance</p>
            <div className="text-lg font-bold">
              <CurrencyDisplay amount={account.initialBalance} />
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] uppercase font-bold text-green-600">Total Credit (+)</p>
            <div className="text-lg font-bold text-green-700">
              <CurrencyDisplay amount={totals.credit} />
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-[10px] uppercase font-bold text-red-600">Total Debit (-)</p>
            <div className="text-lg font-bold text-destructive">
              <CurrencyDisplay amount={totals.debit} />
            </div>
          </div>
          <div className="p-4 bg-primary text-primary-foreground rounded-lg">
            <p className="text-[10px] uppercase font-bold opacity-80">Closing Balance</p>
            <div className="text-lg font-bold">
              <CurrencyDisplay amount={account.currentBalance} />
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b">
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Description / Narration</TableHead>
                <TableHead className="text-right font-bold">Credit (In)</TableHead>
                <TableHead className="text-right font-bold">Debit (Out)</TableHead>
                <TableHead className="text-right font-bold">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions recorded.
                  </TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((t) => (
                  <TableRow key={t.id} className="border-b">
                    <TableCell className="whitespace-nowrap">
                      {format(t.date, "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs">
                      {t.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.type === "Credit" ? <span className="text-green-600"><CurrencyDisplay amount={t.amount} /></span> : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.type === "Debit" ? <span className="text-destructive"><CurrencyDisplay amount={t.amount} /></span> : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <CurrencyDisplay amount={t.balanceAfter} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/30 font-bold">
                <TableCell colSpan={2} className="text-right font-bold">TOTALS / CLOSING:</TableCell>
                <TableCell className="text-right text-green-700">
                  <CurrencyDisplay amount={totals.credit} />
                </TableCell>
                <TableCell className="text-right text-destructive">
                  <CurrencyDisplay amount={totals.debit} />
                </TableCell>
                <TableCell className="text-right text-primary text-lg">
                  <CurrencyDisplay amount={account.currentBalance} />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="mt-12 text-center text-[10px] text-muted-foreground italic border-t pt-4">
          End of Statement - This is an electronically generated report.
        </div>
      </div>
    </div>
  );
}
