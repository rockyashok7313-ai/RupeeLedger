import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, BarChart } from 'lucide-react';
import { Invoice, Expense } from '@/lib/types';

interface Props {
  invoices?: Invoice[];
  expenses?: Expense[];
}

export function ReportsView({ invoices = [], expenses = [] }: Props) {
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    let totalRevenue = 0;
    let pendingReceivables = 0;
    let overdueCount = 0;
    
    const monthlyRevenue = new Array(12).fill(0);

    invoices.forEach(inv => {
      const d = new Date(inv.date);
      if (d.getFullYear() === currentYear && inv.status !== 'draft') {
        totalRevenue += inv.total;
        monthlyRevenue[d.getMonth()] += inv.total;
      }

      if (inv.status === 'sent' || inv.status === 'overdue') {
        pendingReceivables += inv.total;
      }

      if (inv.status === 'overdue') {
        overdueCount++;
      }
    });

    const maxMonthRev = Math.max(...monthlyRevenue, 1);

    return { totalRevenue, pendingReceivables, overdueCount, monthlyRevenue, maxMonthRev };
  }, [invoices]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="premium-heading flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" /> Invoice Analytics & P&L
          </CardTitle>
          <CardDescription>Visual reports of your sales and revenue for {new Date().getFullYear()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 border rounded-lg bg-emerald-50/50">
              <p className="text-sm font-medium text-emerald-800">Total Revenue (YTD)</p>
              <h3 className="text-2xl font-bold text-emerald-900">₹{stats.totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50/50">
              <p className="text-sm font-medium text-blue-800">Pending Receivables</p>
              <h3 className="text-2xl font-bold text-blue-900">₹{stats.pendingReceivables.toFixed(2)}</h3>
            </div>
            <div className="p-4 border rounded-lg bg-rose-50/50">
              <p className="text-sm font-medium text-rose-800">Overdue Invoices</p>
              <h3 className="text-2xl font-bold text-rose-900">{stats.overdueCount}</h3>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BarChart className="h-4 w-4" /> Monthly Revenue Trend
            </h3>
            
            <div className="h-64 rounded-md border p-4 flex items-end justify-between gap-2 bg-white">
              {stats.monthlyRevenue.map((rev, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group">
                  <div className="w-full relative flex justify-center items-end h-full">
                    <div 
                      className="w-full bg-blue-500/80 rounded-t-sm transition-all duration-300 group-hover:bg-blue-600"
                      style={{ 
                        height: `${(rev / stats.maxMonthRev) * 100}%`,
                        minHeight: rev > 0 ? '4px' : '0' 
                      }}
                    >
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap">
                      ₹{rev.toFixed(0)}
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500 mt-2">{months[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
