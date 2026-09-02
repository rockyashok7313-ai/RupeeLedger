import React, { useState, useMemo } from 'react';
import { InventoryItem, Invoice } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, ArrowRightLeft, TrendingDown } from "lucide-react";

interface InventoryModuleProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  invoices: Invoice[];
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ inventory, setInventory, invoices }) => {
  const [activeTab, setActiveTab] = useState("register");

  const totalValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + ((item.basePrice || 0) * (item.currentStock || 0)), 0);
  }, [inventory]);

  const negativeStockItems = useMemo(() => {
    return inventory.filter(item => (item.currentStock || 0) < 0);
  }, [inventory]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => (item.currentStock || 0) >= 0 && (item.currentStock || 0) <= 5);
  }, [inventory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory & Stock</h2>
          <p className="text-muted-foreground mt-1">Manage stock register, transfers, and inventory valuation.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex flex-col items-end">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Total Valuation</span>
          <span className="text-xl font-bold">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Stock Register
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Stock Transfer
          </TabsTrigger>
          <TabsTrigger value="negative" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Alerts
            {(negativeStockItems.length > 0 || lowStockItems.length > 0) && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{negativeStockItems.length + lowStockItems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Register</CardTitle>
              <CardDescription>Real-time view of all inventory items and current quantities.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Item Name</th>
                      <th className="px-4 py-3 font-medium">HSN Code</th>
                      <th className="px-4 py-3 font-medium text-right">Base Price</th>
                      <th className="px-4 py-3 font-medium text-right">Current Stock</th>
                      <th className="px-4 py-3 font-medium text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No items in inventory. Add items from the Dashboard.
                        </td>
                      </tr>
                    ) : (
                      inventory.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.hsnCode || '-'}</td>
                          <td className="px-4 py-3 text-right">₹{item.basePrice.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={(item.currentStock || 0) < 0 ? "destructive" : (item.currentStock || 0) <= 5 ? "secondary" : "default"}>
                              {item.currentStock} {item.unit || 'pcs'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ₹{((item.basePrice || 0) * (item.currentStock || 0)).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="negative" className="mt-6 space-y-4">
          <Card className="border-red-200">
            <CardHeader className="bg-red-50/50">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Negative & Low Stock Items
              </CardTitle>
              <CardDescription>Items that require immediate restocking.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {negativeStockItems.length === 0 && lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-green-600 font-medium">
                  All inventory levels are healthy!
                </div>
              ) : (
                <div className="space-y-6">
                  {negativeStockItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-3 text-sm uppercase">Negative Stock</h4>
                      <div className="grid gap-3">
                        {negativeStockItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 border border-red-100 rounded-lg bg-red-50/30">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="destructive">{item.currentStock} {item.unit || 'pcs'}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {lowStockItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-amber-600 mb-3 text-sm uppercase">Low Stock (≤ 5)</h4>
                      <div className="grid gap-3">
                        {lowStockItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 border border-amber-100 rounded-lg bg-amber-50/30">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">{item.currentStock} {item.unit || 'pcs'}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Transfer / Adjustment</CardTitle>
              <CardDescription>Adjust current stock levels manually or transfer stock between locations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 border rounded-lg border-dashed text-center text-muted-foreground flex flex-col items-center gap-3">
                <ArrowRightLeft className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <h3 className="font-medium text-foreground">Stock Adjustments</h3>
                  <p className="text-sm mt-1">Select an item from the stock register to manually adjust its quantity or record a transfer.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
