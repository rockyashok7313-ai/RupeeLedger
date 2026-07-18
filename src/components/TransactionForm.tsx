"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Account, TransactionType } from "@/lib/types";
import { format, parse } from "date-fns";
import { Sparkles, Loader2, Landmark } from "lucide-react";
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
  onCreateCustomer?: () => void;
  onSuccess: (data: any) => void;
}

export function TransactionForm({ accounts, defaultAccountId, defaultGstEnabled, onCreateCustomer, onSuccess }: TransactionFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [type, setType] = useState<TransactionType>("Debit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [dateInput, setDateInput] = useState<string>(format(new Date(), "dd-MM-yyyy"));

  useEffect(() => {
    if (defaultAccountId) {
      setSelectedAccountId(defaultAccountId);
    } else if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [defaultAccountId, accounts, selectedAccountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !amount || !description || !dateInput) return;

    let parsedDate;
    try {
      parsedDate = parse(dateInput, "dd-MM-yyyy", new Date());
      if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
    } catch (err) {
      toast({ title: "Invalid Date", description: "Please enter a valid date in DD-MM-YYYY format.", variant: "destructive" });
      return;
    }

    onSuccess({
      accountId: selectedAccountId,
      type,
      amount: parseFloat(amount),
      description,
      date: parsedDate.getTime()
    });

    setAmount("");
    setDescription("");
  };

  const handleSuggest = async () => {
    if (!amount) {
      toast({ title: "Please enter an amount first.", variant: "destructive" });
      return;
    }
    setIsSuggesting(true);
    try {
      const token = localStorage.getItem("rupee_ledger_token");
      const response = await fetch("/api/suggest-narration", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ amount, type }),
      });
      if (!response.ok) throw new Error("Failed to get suggestion");
      const data = await response.json();
      if (data.suggestion) setDescription(data.suggestion);
    } catch (error) {
      toast({ title: "Could not get AI suggestion.", variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center p-4">
            <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Please create an account first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-none shadow-xl bg-white/80 backdrop-blur-xl">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-6 border-b border-white/20 rounded-t-xl">
        <CardTitle className="text-xl text-primary font-semibold flex items-center gap-2">
          New Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Date (DD-MM-YYYY)</Label>
            <Input 
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="bg-white/50 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="bg-white/50 focus:bg-white">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(val) => setType(val as TransactionType)}
              className="flex space-x-4 p-1 bg-slate-100 rounded-lg"
            >
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200 w-full justify-center">
                <RadioGroupItem value="Credit" id="r1" className="text-green-600" />
                <Label htmlFor="r1" className="font-semibold text-green-700 cursor-pointer">IN (+)</Label>
              </div>
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200 w-full justify-center">
                <RadioGroupItem value="Debit" id="r2" className="text-red-600" />
                <Label htmlFor="r2" className="font-semibold text-red-700 cursor-pointer">OUT (-)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="bg-white/50 focus:bg-white text-lg font-medium"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Narration / Description</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSuggest}
                disabled={isSuggesting || !amount}
                className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                {isSuggesting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                AI Suggest
              </Button>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter details..."
              required
              className="resize-none bg-white/50 focus:bg-white"
            />
          </div>

          <Button type="submit" className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-md">
            Save Entry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
