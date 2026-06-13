"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Account, TransactionType } from "@/lib/types";
import { suggestNarration } from "@/ai/flows/ai-narration-suggester-flow";
import { Sparkles, Loader2, PlusCircle, Landmark } from "lucide-react";
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
  onSuccess: (data: { accountId: string; type: TransactionType; amount: number; description: string }) => void;
}

export function TransactionForm({ accounts, defaultAccountId, onSuccess }: TransactionFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [type, setType] = useState<TransactionType>("Debit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Sync selected account when default changes
  useEffect(() => {
    if (defaultAccountId) {
      setSelectedAccountId(defaultAccountId);
    } else if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [defaultAccountId, accounts]);

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
      const suggestion = await suggestNarration({
        transactionType: type,
        amount: numAmount,
        accountName: selectedAccount.name,
        descriptionHint: description || undefined,
      });
      setDescription(suggestion);
    } catch (error) {
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

    onSuccess({
      accountId: selectedAccountId,
      type,
      amount: numAmount,
      description,
    });
    setAmount("");
    setDescription("");
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

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 shadow-md">
            Record Transaction
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
