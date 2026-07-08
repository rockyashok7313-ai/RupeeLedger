"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MasterFieldType = 'text' | 'number' | 'email' | 'select';

export interface MasterField {
  key: string;
  label: string;
  type: MasterFieldType;
  options?: { label: string, value: string }[];
  required?: boolean;
}

interface MasterDataModuleProps {
  title: string;
  type: 'vendors' | 'customers' | 'products' | 'warehouses';
  idField: string;
  fields: MasterField[];
  token: string | null;
}

export function MasterDataModule({ title, type, idField, fields, token }: MasterDataModuleProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/master?type=${type}&t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const json = await res.json();
      if (res.ok) {
        setData(json.data || []);
      } else {
        throw new Error(json.error || 'Failed to fetch');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
    } else {
      setEditingItem(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setSaving(true);
    try {
      // Auto-generate ID if new
      const payloadData = { ...formData };
      if (!editingItem) {
        payloadData[idField] = `${type.toUpperCase().substring(0, 3)}-${Date.now()}`;
      }

      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem 
        ? { type, id: editingItem[idField], idField, data: payloadData }
        : { type, data: payloadData };

      const res = await fetch(`/api/erp/master`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      
      toast({ title: "Success", description: "Record saved successfully" });
      setIsModalOpen(false);
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        fetchData();
      }, 100);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    try {
      const res = await fetch(`/api/erp/master`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, id, idField })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      toast({ title: "Success", description: "Record deleted" });
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        fetchData();
      }, 100);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredData = data.filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Manage {title.toLowerCase()} records</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex mb-4 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={`Search ${title}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/50"
            />
          </div>
        </div>

        <div className="border rounded-md bg-white/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                {fields.slice(0, 4).map(f => (
                  <TableHead key={f.key} className="font-semibold text-slate-700">{f.label}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, idx) => (
                  <TableRow key={idx}>
                    {fields.slice(0, 4).map(f => (
                      <TableCell key={f.key} className="font-medium">
                        {item[f.key] || '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}>
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item[idField])}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} {title.slice(0,-1)}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(f => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label} {f.required && <span className="text-red-500">*</span>}</Label>
                  {f.type === 'select' && f.options ? (
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData[f.key] || ''}
                      onChange={(e) => setFormData({...formData, [f.key]: e.target.value})}
                      required={f.required}
                    >
                      <option value="">Select...</option>
                      {f.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <Input 
                      type={f.type}
                      value={formData[f.key] || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value
                      })}
                      required={f.required}
                      placeholder={`Enter ${f.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
