"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Account, TransactionType } from "@/lib/types";
import { format, parse } from "date-fns";
import { Sparkles, Loader2, PlusCircle, Landmark, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionFormProps {
  accounts: Account[];
  defaultAccountId?: string | null;
  defaultGstEnabled?: boolean;
  onSuccess: (data: { 
    accountId: string; 
    type: TransactionType; 
    amount: number; 
    description: string; 
    date: number;
    gstEnabled?: boolean;
    gstRate?: number;
    gstType?: 'CGST+SGST' | 'IGST';
    cgst?: number;
    sgst?: number;
    igst?: number;
    taxableAmount?: number;
    invoiceNumber?: string;
    customerName?: string;
    customerGstin?: string;
    gstCalculationType?: 'including' | 'excluding';
    hsnCode?: string;
    customerAddress?: string;
    vehicleNo?: string;
  }) => void;
  onCreateCustomer?: () => void;
}

export function TransactionForm({ accounts, defaultAccountId, defaultGstEnabled, onSuccess, onCreateCustomer }: TransactionFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [type, setType] = useState<TransactionType>("Debit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [dateInput, setDateInput] = useState<string>(format(new Date(), "dd-MM-yyyy"));

  // GST State Extensions
  const [gstEnabled, setGstEnabled] = useState(defaultGstEnabled ?? false);
  const [gstRate, setGstRate] = useState("18");
  const [gstType, setGstType] = useState<'CGST+SGST' | 'IGST'>("CGST+SGST");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [gstCalculationType, setGstCalculationType] = useState<'including' | 'excluding'>('including');
  const [hsnCode, setHsnCode] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');

  // Customer name autocomplete state
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerNameRef = useRef<HTMLDivElement>(null);

  // Filter accounts matching the typed customer name
  const customerSuggestions = useMemo(() => {
    if (!customerName.trim()) return [];
    const q = customerName.toLowerCase();
    return accounts.filter(acc =>
      acc.name.toLowerCase().includes(q) ||
      (acc.gstin && acc.gstin.toLowerCase().includes(q))
    );
  }, [accounts, customerName]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerNameRef.current && !customerNameRef.current.contains(e.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync selected account when default changes
  useEffect(() => {
    if (defaultAccountId) {
      setSelectedAccountId(defaultAccountId);
    } else if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAccountId, accounts]);

  // Pick a customer from suggestions — auto-fill GSTIN and address
  const handlePickCustomer = (acc: Account) => {
    setCustomerName(acc.name || '');
    setCustomerGstin(acc.gstin || '');
    setCustomerAddress(acc.address || '');
    setShowCustomerSuggestions(false);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleSuggest = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Please enter a valid amount first", variant: "destructive" });
      return;
    }
    if (!selectedAccount) {
      toast({ title: "Please select an account first", variant: "destructive" });
      return;
    }

    setIsSuggesting(true);
    try {
      const isMobile = typeof window !== 'undefined' && window.location.origin.startsWith('capacitor://');
      const apiEndpoint = isMobile 
        ? 'https://v0-indian-payroll-website.vercel.app/api/suggest-narration' 
        : '/api/suggest-narration';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionType: type,
          amount: numAmount,
          accountName: selectedAccount.name,
          descriptionHint: description || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      if (data.suggestion) {
        setDescription(data.suggestion);
      } else {
        throw new Error('No suggestion returned');
      }
    } catch {
      toast({ title: "Failed to suggest narration", variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      toast({ title: "Please select an account", variant: "destructive" });
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!description.trim()) return;

    // Parse manual date
    const parsedDate = parse(dateInput, "dd-MM-yyyy", new Date());
    if (isNaN(parsedDate.getTime())) {
      toast({ title: "Please enter a valid date in DD-MM-YYYY format", variant: "destructive" });
      return;
    }

    // Dynamic GST Splits Calculation
    const rate = parseFloat(gstRate);
    let cgst = 0, sgst = 0, igst = 0, taxableAmount = numAmount, recordedAmount = numAmount;
    if (gstEnabled && rate > 0) {
      if (gstCalculationType === 'excluding') {
        taxableAmount = numAmount;
        const totalGst = Math.round((numAmount * (rate / 100)) * 100) / 100;
        recordedAmount = Math.round((numAmount + totalGst) * 100) / 100;
        if (gstType === 'CGST+SGST') {
          cgst = Math.round((totalGst / 2) * 100) / 100;
          sgst = Math.round((totalGst / 2) * 100) / 100;
        } else {
          igst = totalGst;
        }
      } else {
        taxableAmount = Math.round((numAmount / (1 + rate / 100)) * 100) / 100;
        const totalGst = Math.round((numAmount - taxableAmount) * 100) / 100;
        recordedAmount = numAmount;
        if (gstType === 'CGST+SGST') {
          cgst = Math.round((totalGst / 2) * 100) / 100;
          sgst = Math.round((totalGst / 2) * 100) / 100;
        } else {
          igst = totalGst;
        }
      }
    }

    onSuccess({
      accountId: selectedAccountId,
      type,
      amount: recordedAmount,
      description,
      date: parsedDate.getTime(),
      gstEnabled,
      gstRate: gstEnabled ? rate : undefined,
      gstType: gstEnabled ? gstType : undefined,
      cgst: gstEnabled ? cgst : undefined,
      sgst: gstEnabled ? sgst : undefined,
      igst: gstEnabled ? igst : undefined,
      taxableAmount: gstEnabled ? taxableAmount : undefined,
      invoiceNumber: gstEnabled ? invoiceNumber : undefined,
      customerName: gstEnabled ? customerName : undefined,
      customerGstin: gstEnabled ? customerGstin : undefined,
      gstCalculationType: gstEnabled ? gstCalculationType : undefined,
      hsnCode: gstEnabled ? hsnCode : undefined,
      customerAddress: gstEnabled ? customerAddress : undefined,
      vehicleNo: gstEnabled ? vehicleNo : undefined,
    });

    setAmount("");
    setDescription("");
    setDateInput(format(new Date(), "dd-MM-yyyy"));
    setGstEnabled(defaultGstEnabled ?? false);
    setInvoiceNumber("");
    setCustomerName("");
    setCustomerGstin("");
    setCustomerAddress("");
    setHsnCode("");
    setVehicleNo("");
    setGstCalculationType("including");
  };

  if (accounts.length === 0) return null;

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <PlusCircle className="mr-2 h-5 w-5 text-accent" />
          Quick Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-select">Select Account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger id="account-select">
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <Landmark className="h-3 w-3 text-muted-foreground" />
                      <span>{acc.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(val) => setType(val as TransactionType)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Debit" id="debit" />
                <Label htmlFor="debit" className="text-destructive font-semibold cursor-pointer">Debit (Out)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Credit" id="credit" />
                <Label htmlFor="credit" className="text-green-600 font-semibold cursor-pointer">Credit (In)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Transaction Date (DD-MM-YYYY)</Label>
            <Input
              id="date"
              type="text"
              placeholder="e.g. 16-06-2026"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Narration</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-accent hover:text-accent/80 p-0 h-auto font-medium flex items-center"
                onClick={handleSuggest}
                disabled={isSuggesting}
              >
                {isSuggesting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                AI Suggest
              </Button>
            </div>
            <Textarea
              id="description"
              placeholder="Purpose of transaction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-[80px]"
            />
          </div>

          {/* GST and Invoice Checkbox Toggle */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <input 
              id="gst-enabled" 
              type="checkbox" 
              checked={gstEnabled} 
              onChange={(e) => setGstEnabled(e.target.checked)} 
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
            />
            <Label htmlFor="gst-enabled" className="font-semibold cursor-pointer text-sm">Create GST Tax Invoice</Label>
          </div>

          {gstEnabled && (
            <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg animate-in slide-in-from-top-2 duration-300">

              {/* Create Customer Ledger Button */}
              {onCreateCustomer && (
                <div className="pb-2 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={onCreateCustomer}
                    className="w-full flex items-center justify-center gap-2 h-9 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create Customer Ledger
                  </button>
                </div>
              )}

              {/* GST Calculation Mode Toggle */}
              <div className="space-y-1 pb-1 border-b border-slate-200">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GST Calculation Mode</Label>
                <div className="relative flex items-center bg-slate-200/60 p-0.5 rounded-full border border-slate-300/40 w-full h-8 select-none">
                  {/* Sliding indicator */}
                  <div 
                    className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-white rounded-full shadow-sm transition-all duration-300 ease-out"
                    style={{
                      left: gstCalculationType === 'including' ? '2px' : 'calc(50%)'
                    }}
                  />
                  
                  {/* Tab 1 */}
                  <button
                    type="button"
                    onClick={() => setGstCalculationType('including')}
                    className={`flex-1 text-center text-[10px] font-bold z-10 transition-colors duration-200 ${gstCalculationType === 'including' ? 'text-primary' : 'text-slate-500'}`}
                  >
                    Including GST (Inclusive)
                  </button>
                  
                  {/* Tab 2 */}
                  <button
                    type="button"
                    onClick={() => setGstCalculationType('excluding')}
                    className={`flex-1 text-center text-[10px] font-bold z-10 transition-colors duration-200 ${gstCalculationType === 'excluding' ? 'text-primary' : 'text-slate-500'}`}
                  >
                    Excluding GST (Exclusive)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="invoice-no" className="text-xs">Invoice Number</Label>
                  <Input 
                    id="invoice-no" 
                    value={invoiceNumber} 
                    onChange={(e) => setInvoiceNumber(e.target.value)} 
                    placeholder="e.g. INV-102" 
                    className="h-8 text-xs bg-white"
                    required={gstEnabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gst-rate" className="text-xs">GST Rate (%)</Label>
                  <Select value={gstRate} onValueChange={setGstRate}>
                    <SelectTrigger id="gst-rate" className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5% GST</SelectItem>
                      <SelectItem value="12">12% GST</SelectItem>
                      <SelectItem value="18">18% GST</SelectItem>
                      <SelectItem value="28">28% GST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ===== CUSTOMER NAME with type-ahead autocomplete ===== */}
              <div className="space-y-1 relative" ref={customerNameRef}>
                <Label htmlFor="cust-name" className="text-xs">Customer Name</Label>
                <Input 
                  id="cust-name" 
                  value={customerName} 
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => {
                    if (customerName.trim()) setShowCustomerSuggestions(true);
                  }}
                  placeholder="Type customer name to search..." 
                  className="h-8 text-xs bg-white"
                  required={gstEnabled}
                  autoComplete="off"
                />
                {/* Autocomplete suggestion dropdown */}
                {showCustomerSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-44 overflow-y-auto">
                    {customerSuggestions.map(acc => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handlePickCustomer(acc)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{acc.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {acc.gstin || 'No GSTIN'}{acc.address ? ` • ${acc.address}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="cust-gstin" className="text-xs">Customer GSTIN</Label>
                  <Input 
                    id="cust-gstin" 
                    value={customerGstin} 
                    onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())} 
                    placeholder="e.g. 07AAAAA1111A1Z1" 
                    className="h-8 text-xs font-mono uppercase bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gst-type" className="text-xs">Tax Treatment</Label>
                  <Select value={gstType} onValueChange={(val) => setGstType(val as 'CGST+SGST' | 'IGST')}>
                    <SelectTrigger id="gst-type" className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CGST+SGST">Intra-State (CGST+SGST)</SelectItem>
                      <SelectItem value="IGST">Inter-State (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* HSN Code */}
              <div className="space-y-1">
                <Label htmlFor="hsn-code" className="text-xs">HSN / SAC Code</Label>
                <Input 
                  id="hsn-code" 
                  value={hsnCode} 
                  onChange={(e) => setHsnCode(e.target.value)} 
                  placeholder="e.g. 9983 or 8471" 
                  className="h-8 text-xs font-mono bg-white"
                />
              </div>

              {/* Customer Address */}
              <div className="space-y-1">
                <Label htmlFor="cust-addr" className="text-xs">Buyer Full Address</Label>
                <Textarea
                  id="cust-addr"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. 123 MG Road, Bengaluru, Karnataka - 560001"
                  className="min-h-[56px] text-xs bg-white resize-none"
                />
              </div>

              {/* Vehicle Number */}
              <div className="space-y-1">
                <Label htmlFor="vehicle-no" className="text-xs">Vehicle Number</Label>
                <Input 
                  id="vehicle-no" 
                  value={vehicleNo} 
                  onChange={(e) => setVehicleNo(e.target.value)} 
                  placeholder="e.g. MH 01 AB 1234" 
                  className="h-8 text-xs font-mono uppercase bg-white"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 shadow-md">
            Record Transaction
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
