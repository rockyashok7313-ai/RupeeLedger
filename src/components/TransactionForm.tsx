"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Account, TransactionType } from "@/lib/types";
import { suggestNarration } from "@/ai/flows/ai-narration-suggester-flow";
import { Sparkles, Loader2, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "@/hooks/use-toast";

interface TransactionFormProps {
  account: Account;
  onSuccess: (data: { type: TransactionType; amount: number; description: string }) => void;
}

export function TransactionForm({ account, onSuccess }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>("Debit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggest = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Please enter a valid amount first", variant: "destructive" });
      return;
    }

    setIsSuggesting(true);
    try {
      const suggestion = await suggestNarration({
        transactionType: type,
        amount: numAmount,
        accountName: account.name,
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
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!description.trim()) return;

    onSuccess({
      type,
      amount: numAmount,
      description,
    });
    setAmount("");
    setDescription("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <PlusCircle className="mr-2 h-5 w-5 text-accent" />
          Add Transaction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(val) => setType(val as TransactionType)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Debit" id="debit" />
                <Label htmlFor="debit" className="text-destructive font-semibold">Debit (Outgoing)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Credit" id="credit" />
                <Label htmlFor="credit" className="text-green-600 font-semibold">Credit (Incoming)</Label>
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

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            Record Transaction
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}