"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function GSTRReports({ token }: { token: string | null }) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<"GSTR-1" | "GSTR-2" | "GSTR-3B">("GSTR-1");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (token) fetchReportData();
  }, [token, reportType, month, year]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Create start/end epoch for filtering
      const startDate = startOfMonth(new Date(year, month)).getTime();
      const endDate = endOfMonth(new Date(year, month)).getTime();

      let typesToFetch = [];
      if (reportType === "GSTR-1") typesToFetch = ["sale_invoices", "credit_notes"];
      else if (reportType === "GSTR-2") typesToFetch = ["purchase_invoices", "debit_notes"];
      else typesToFetch = ["sale_invoices", "purchase_invoices"]; // 3B

      const allData = [];
      for (const t of typesToFetch) {
        const res = await fetch(`/api/erp/transactions?type=${t}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const raw = await res.json();
          // Filter by month
          const filtered = raw.filter((item: any) => {
            const date = new Date(item.date).getTime();
            return date >= startDate && date <= endDate;
          });
          allData.push(...filtered.map((item: any) => ({ ...item, _docType: t })));
        }
      }
      setData(allData);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load report data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    
    // Simplistic CSV export for GSTR
    const headers = ["Doc Type", "Doc No", "Date", "Party ID", "Supply Type", "Taxable Value", "IGST", "CGST", "SGST", "Total Amount"];
    const rows = data.map(item => [
      item._docType,
      item.sale_inv_id || item.purchase_inv_id || item.cn_id || item.dn_id || "N/A",
      format(new Date(item.date), 'dd/MM/yyyy'),
      item.customer_id || item.vendor_id || "N/A",
      item.supply_type || "B2B",
      item.total_before_tax || 0,
      item.igst_total || 0,
      item.cgst_total || 0,
      item.sgst_total || 0,
      item.grand_total || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_${month + 1}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>GST Returns & Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <select 
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
            >
              <option value="GSTR-1">GSTR-1 (Outward Supplies / Sales)</option>
              <option value="GSTR-2">GSTR-2 (Inward Supplies / Purchases)</option>
              <option value="GSTR-3B">GSTR-3B (Monthly Summary)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Month</Label>
            <select 
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i} value={i}>{format(new Date(2000, i), 'MMMM')}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <select 
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 flex items-end">
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="border rounded-md bg-white/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Doc No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Taxable (₹)</TableHead>
                <TableHead className="text-right">IGST (₹)</TableHead>
                <TableHead className="text-right">CGST (₹)</TableHead>
                <TableHead className="text-right">SGST (₹)</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transactions found for {format(new Date(year, month), 'MMMM yyyy')}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {item.sale_inv_id || item.purchase_inv_id || item.cn_id || item.dn_id || "-"}
                    </TableCell>
                    <TableCell>{format(new Date(item.date), 'dd-MMM-yy')}</TableCell>
                    <TableCell>{item._docType}</TableCell>
                    <TableCell className="text-right font-medium">₹{(item.total_before_tax || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{(item.igst_total || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{(item.cgst_total || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{(item.sgst_total || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-bold text-slate-800">₹{(item.grand_total || 0).toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
