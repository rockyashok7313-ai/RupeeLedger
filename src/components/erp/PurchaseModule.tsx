import React, { useState, useMemo } from 'react';
import { Expense, Client } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Users, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface PurchaseModuleProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  clients: Client[];
}

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({ expenses, clients }) => {
  const [activeTab, setActiveTab] = useState("daily");

  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);

  const monthlyPurchases = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return isWithinInterval(expDate, { start: currentMonthStart, end: currentMonthEnd });
    });
  }, [expenses, currentMonthStart, currentMonthEnd]);

  const totalMonthlyPurchases = useMemo(() => {
    return monthlyPurchases.reduce((sum, exp) => sum + exp.amount, 0);
  }, [monthlyPurchases]);

  // Supplier-wise breakdown (AP)
  const supplierAP = useMemo(() => {
    const breakdown: Record<string, { total: number; count: number; name: string }> = {};
    expenses.forEach(exp => {
      const name = exp.vendorName || 'Unknown Supplier';
      if (!breakdown[name]) {
        breakdown[name] = { total: 0, count: 0, name };
      }
      breakdown[name].total += exp.amount;
      breakdown[name].count += 1;
    });
    return Object.values(breakdown).sort((a, b) => b.total - a.total);
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase & Accounts Payable</h2>
          <p className="text-muted-foreground mt-1">Track vendor bills, monthly purchases, and supplier balances.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex flex-col items-end">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">This Month's Purchases</span>
          <span className="text-xl font-bold">₹{totalMonthlyPurchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Monthly Purchase Register
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Supplier Accounts Payable
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Register</CardTitle>
              <CardDescription>Vendor bills recorded in the current month ({format(today, 'MMMM yyyy')}).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                      <th className="px-4 py-3 font-medium text-right">Tax (GST)</th>
                      <th className="px-4 py-3 font-medium text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthlyPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No purchases recorded this month.
                        </td>
                      </tr>
                    ) : (
                      monthlyPurchases.sort((a, b) => b.date - a.date).map((exp) => (
                        <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                          <td className="px-4 py-3 font-medium">
                            <Badge variant="outline">{exp.category}</Badge>
                          </td>
                          <td className="px-4 py-3">{exp.vendorName || '-'}</td>
                          <td className="px-4 py-3 text-right">₹{(exp.cgst + exp.sgst + exp.igst).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">₹{exp.amount.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Accounts Payable</CardTitle>
              <CardDescription>Total purchase amounts attributed to each supplier/vendor.</CardDescription>
            </CardHeader>
            <CardContent>
              {supplierAP.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No suppliers found in expense records.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {supplierAP.map(supplier => (
                    <div key={supplier.name} className="p-5 border rounded-xl bg-card shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{supplier.name}</h4>
                          <p className="text-xs text-muted-foreground">{supplier.count} Bills</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-1">Total Purchases</p>
                        <p className="text-2xl font-bold text-red-600">₹{supplier.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
