"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export function StockJournal({ token }: { token: string | null }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    product_id: "",
    warehouse_id: "",
    movement_type: "IN",
    quantity: 1,
    reference_id: "",
    notes: ""
  });

  useEffect(() => {
    if (token) {
      fetchData();
      fetchMasterData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/inventory?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setMovements(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const pRes = await fetch(`/api/erp/master?type=products&t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (pRes.ok) setProducts((await pRes.json()).data || []);

      const wRes = await fetch(`/api/erp/master?type=warehouses&t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (wRes.ok) setWarehouses((await wRes.json()).data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setSaving(true);
    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).getTime()
      };

      const res = await fetch(`/api/erp/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: payload })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      
      toast({ title: "Success", description: "Stock movement recorded successfully" });
      setIsModalOpen(false);
      setFormData({ ...formData, quantity: 1, reference_id: "", notes: "" }); // Reset some fields
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-2xl font-bold">Stock Journal</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Track inventory movements (IN/OUT)</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Entry
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md bg-white/50 overflow-hidden mt-4">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No stock movements recorded.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {format(new Date(item.date), 'dd-MMM-yyyy')}
                    </TableCell>
                    <TableCell>
                      {item.movement_type === 'IN' 
                        ? <span className="flex items-center text-green-600 font-semibold"><ArrowDownRight className="h-4 w-4 mr-1"/> IN</span>
                        : <span className="flex items-center text-red-600 font-semibold"><ArrowUpRight className="h-4 w-4 mr-1"/> OUT</span>
                      }
                    </TableCell>
                    <TableCell>{products.find(p => p.product_id === item.product_id)?.product_name || item.product_id}</TableCell>
                    <TableCell>{warehouses.find(w => w.warehouse_id === item.warehouse_id)?.warehouse_name || item.warehouse_id}</TableCell>
                    <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{item.reference_id || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Stock Movement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Movement Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.movement_type}
                  onChange={e => setFormData({...formData, movement_type: e.target.value})}
                  required
                >
                  <option value="IN">Stock IN (+)</option>
                  <option value="OUT">Stock OUT (-)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Product</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.product_id}
                onChange={e => setFormData({...formData, product_id: e.target.value})}
                required
              >
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.warehouse_id}
                  onChange={e => setFormData({...formData, warehouse_id: e.target.value})}
                  required
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference ID (Optional)</Label>
              <Input placeholder="e.g. PO-12345" value={formData.reference_id} onChange={e => setFormData({...formData, reference_id: e.target.value})} />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
