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
    </div>
  );
}
