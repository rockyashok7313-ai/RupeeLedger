import React, { useMemo, useState } from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format, isSameDay, isBefore, startOfDay, addDays } from 'date-fns';
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
  TableFooter,
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

  // Calculate the total worth of all accounts at the end of the selected day
  const closingBalanceForDay = useMemo(() => {
    const endOfSelectedDay = startOfDay(addDays(date, 1)).getTime();
    
    // Sum initial balances
    const initialTotal = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
    
    // Add net change from all transactions occurring before the end of the selected day
    const netChange = transactions
      .filter(t => t.date < endOfSelectedDay)
      .reduce((sum, t) => {
        return t.type === 'Credit' ? sum + t.amount : sum - t.amount;
      }, 0);

    return initialTotal + netChange;
  }, [accounts, transactions, date]);

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

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] uppercase font-bold text-green-600 mb-1">Incoming (Credit)</p>
            <div className="text-xl font-bold text-green-700">
              <CurrencyDisplay amount={stats.credit} />
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Outgoing (Debit)</p>
            <div className="text-xl font-bold text-destructive">
              <CurrencyDisplay amount={stats.debit} />
            </div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-[10px] uppercase font-bold text-primary mb-1">Closing Net Worth</p>
            <div className="text-xl font-bold text-primary">
              <CurrencyDisplay amount={closingBalanceForDay} />
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Account</TableHead>
                <TableHead>Description / Narration</TableHead>
                <TableHead className="text-right">Credit (In)</TableHead>
                <TableHead className="text-right">Debit (Out)</TableHead>
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
            <TableFooter>
              <TableRow className="bg-muted/30 font-bold">
                <TableCell colSpan={2} className="text-right">DAY TOTALS:</TableCell>
                <TableCell className="text-right text-green-700">
                  <CurrencyDisplay amount={stats.credit} />
                </TableCell>
                <TableCell className="text-right text-destructive">
                  <CurrencyDisplay amount={stats.debit} />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="mt-8 flex flex-col items-end space-y-2">
          <div className="flex justify-between w-64 border-t pt-2">
            <span className="font-medium text-muted-foreground">Daily Net Change:</span>
            <CurrencyDisplay amount={stats.credit - stats.debit} showSign />
          </div>
          <div className="flex justify-between w-64 border-t-2 border-primary pt-2 font-bold text-primary text-lg">
            <span>Closing Balance:</span>
            <CurrencyDisplay amount={closingBalanceForDay} />
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-muted-foreground italic pt-4 border-t border-dashed">
          Daily summary generated by RupeeLedger.
        </div>
      </div>
    </div>
  );
}
