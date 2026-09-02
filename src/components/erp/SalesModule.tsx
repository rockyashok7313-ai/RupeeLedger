import React, { useState, useMemo } from 'react';
import { Invoice, Client } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, CalendarDays, IndianRupee } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface SalesModuleProps {
  invoices: Invoice[];
  clients: Client[];
}

export const SalesModule: React.FC<SalesModuleProps> = ({ invoices, clients }) => {
  const [activeTab, setActiveTab] = useState("daily");

  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);

  const monthlyInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return isWithinInterval(invDate, { start: currentMonthStart, end: currentMonthEnd });
    });
  }, [invoices, currentMonthStart, currentMonthEnd]);

  const totalMonthlySales = useMemo(() => {
    return monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0);
  }, [monthlyInvoices]);

  // Agent-wise breakdown
  const agentSales = useMemo(() => {
    const breakdown: Record<string, { total: number; count: number; name: string }> = {};
    invoices.forEach(inv => {
      if (inv.agentId) {
        if (!breakdown[inv.agentId]) {
          breakdown[inv.agentId] = { total: 0, count: 0, name: inv.agentName || 'Unknown Agent' };
        }
        breakdown[inv.agentId].total += inv.total;
        breakdown[inv.agentId].count += 1;
      }
    });
    return Object.values(breakdown).sort((a, b) => b.total - a.total);
  }, [invoices]);

  // Credit vs Cash
  const creditVsCash = useMemo(() => {
    let cash = 0;
    let credit = 0;
    invoices.forEach(inv => {
      if (inv.status === 'paid') cash += inv.total;
      else credit += inv.total; // draft, sent, overdue are considered credit/unpaid here
    });
    return { cash, credit };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales & Accounts Receivable</h2>
          <p className="text-muted-foreground mt-1">Analyze your sales performance, agent metrics, and outstanding receivables.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex flex-col items-end">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">This Month's Sales</span>
          <span className="text-xl font-bold">₹{totalMonthlySales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Daily & Monthly Summary
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Agent Performance
          </TabsTrigger>
          <TabsTrigger value="credit" className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4" /> Credit vs Cash
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales Register</CardTitle>
              <CardDescription>Sales recorded in the current month ({format(today, 'MMMM yyyy')}).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Invoice No</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                      <th className="px-4 py-3 font-medium text-right">Tax</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthlyInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No sales recorded this month.
                        </td>
                      </tr>
                    ) : (
                      monthlyInvoices.sort((a, b) => b.date - a.date).map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">{format(new Date(inv.date), 'dd MMM yyyy')}</td>
                          <td className="px-4 py-3 font-medium">{inv.prefix}{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">{inv.clientName}</td>
                          <td className="px-4 py-3 text-right">₹{inv.subtotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">₹{(inv.cgst + inv.sgst + inv.igst).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-medium">₹{inv.total.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salesman / Agent Performance</CardTitle>
              <CardDescription>Total sales attributed to each agent/salesman.</CardDescription>
            </CardHeader>
            <CardContent>
              {agentSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No agents assigned to any invoices. You can assign agents when creating an invoice.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {agentSales.map(agent => (
                    <div key={agent.name} className="p-5 border rounded-xl bg-card shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{agent.name}</h4>
                          <p className="text-xs text-muted-foreground">{agent.count} Invoices</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-1">Total Generated</p>
                        <p className="text-2xl font-bold text-primary">₹{agent.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit vs Cash Analysis</CardTitle>
              <CardDescription>Overview of outstanding receivables vs realized cash.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <IndianRupee className="h-5 w-5" />
                    <h3 className="font-semibold">Realized Cash (Paid)</h3>
                  </div>
                  <p className="text-4xl font-bold text-green-800">₹{creditVsCash.cash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-sm text-green-600 mt-2">Money received from closed invoices.</p>
                </div>
                
                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                    <TrendingUp className="h-5 w-5" />
                    <h3 className="font-semibold">Outstanding Credit</h3>
                  </div>
                  <p className="text-4xl font-bold text-amber-800">₹{creditVsCash.credit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-sm text-amber-600 mt-2">Money owed from draft, sent, or overdue invoices.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
