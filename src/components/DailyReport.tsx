import React, { useMemo, useState } from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format, isSameDay } from 'date-fns';
import { Printer, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DailyReport({ transactions, accounts }: { transactions: Transaction[]; accounts: Account[] }) {
  const [date, setDate] = useState<Date>(new Date());

  const dailyTransactions = useMemo(() => 
    transactions.filter(t => isSameDay(new Date(t.date), date)),
    [transactions, date]
  );

  const stats = useMemo(() => {
    return dailyTransactions.reduce((acc, t) => {
      if (t.type === 'Credit') acc.credit += t.amount;
      else acc.debit += t.amount;
      return acc;
    }, { credit: 0, debit: 0 });
  }, [dailyTransactions]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 no-print items-start sm:items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button onClick={handlePrint} className="w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" /> Print Daily Summary
        </Button>
      </div>

      <div className="print-only p-8 bg-white border rounded-lg">
        <div className="text-center border-b pb-6 mb-8">
          <h1 className="text-3xl font-bold text-primary">RupeeLedger</h1>
          <h2 className="text-xl font-semibold mt-2">Daily Transaction Summary</h2>
          <p className="text-muted-foreground">{format(date, "EEEE, MMMM do, yyyy")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xs uppercase font-bold text-green-600 mb-1">Total Incoming (Credit)</p>
            <div className="text-2xl font-bold text-green-700">
              <CurrencyDisplay amount={stats.credit} />
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs uppercase font-bold text-red-600 mb-1">Total Outgoing (Debit)</p>
            <div className="text-2xl font-bold text-red-700">
              <CurrencyDisplay amount={stats.debit} />
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Debit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No transactions recorded for this date.
                  </TableCell>
                </TableRow>
              ) : (
                dailyTransactions.map((t) => {
                  const account = accounts.find(a => a.id === t.accountId);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{account?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-xs">{t.description}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {t.type === 'Credit' ? <CurrencyDisplay amount={t.amount} /> : '-'}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-semibold">
                        {t.type === 'Debit' ? <CurrencyDisplay amount={t.amount} /> : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-full sm:w-64 space-y-2">
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Net Change:</span>
              <CurrencyDisplay amount={stats.credit - stats.debit} showSign />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
