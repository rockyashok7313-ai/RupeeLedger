"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  LayoutDashboard, 
  History, 
  Settings,
  FileText,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Account, Transaction, AccountType, TransactionType } from "@/lib/types";
import { AccountCard } from "@/components/AccountCard";
import { TransactionForm } from "@/components/TransactionForm";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { VoucherPrint } from "@/components/VoucherPrint";

export default function RupeeLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger">("dashboard");
  const [selectedVoucher, setSelectedVoucher] = useState<{t: Transaction, a: Account} | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem("rupee_ledger_accounts");
    const savedTransactions = localStorage.getItem("rupee_ledger_transactions");
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  // Save to local storage whenever data changes
  useEffect(() => {
    localStorage.setItem("rupee_ledger_accounts", JSON.stringify(accounts));
    localStorage.setItem("rupee_ledger_transactions", JSON.stringify(transactions));
  }, [accounts, transactions]);

  const addAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const type = formData.get("type") as AccountType;
    const balance = parseFloat(formData.get("balance") as string) || 0;

    const newAccount: Account = {
      id: Math.random().toString(36).substring(7),
      name,
      type,
      initialBalance: balance,
      currentBalance: balance,
      createdAt: Date.now(),
    };

    setAccounts([...accounts, newAccount]);
    setIsNewAccountOpen(false);
    toast({ title: "Account created successfully" });
  };

  const addTransaction = (data: { type: TransactionType; amount: number; description: string }) => {
    if (!selectedAccountId) return;

    const account = accounts.find((a) => a.id === selectedAccountId);
    if (!account) return;

    const newBalance = data.type === "Credit" 
      ? account.currentBalance + data.amount 
      : account.currentBalance - data.amount;

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substring(7),
      accountId: selectedAccountId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: Date.now(),
      balanceAfter: newBalance,
    };

    setTransactions([newTransaction, ...transactions]);
    setAccounts(accounts.map(a => a.id === selectedAccountId ? { ...a, currentBalance: newBalance } : a));
    toast({ title: "Transaction recorded" });
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const accountTransactions = transactions.filter(t => t.accountId === selectedAccountId);

  return (
    <div className="min-h-screen flex flex-col no-print">
      <Toaster />
      
      {/* Sidebar - Web */}
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground p-6 shadow-xl border-r">
          <div className="flex items-center space-x-3 mb-12">
            <div className="bg-accent p-2 rounded-lg">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">RupeeLedger</h1>
          </div>

          <nav className="space-y-2">
            <Button 
              variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button 
              variant={activeTab === "ledger" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("ledger")}
              disabled={!selectedAccountId}
            >
              <History className="mr-2 h-4 w-4" /> Ledger View
            </Button>
          </nav>

          <div className="mt-auto pt-6 border-t border-primary-foreground/10">
            <div className="mb-4">
              <p className="text-xs uppercase text-primary-foreground/60 font-semibold mb-1">Total Net Worth</p>
              <div className="text-xl font-bold">
                <CurrencyDisplay amount={totalBalance} />
              </div>
            </div>
            <Button variant="outline" className="w-full text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
          </div>
        </aside>

        <main className="flex-1 bg-background overflow-auto p-4 md:p-8">
          {/* Header Mobile */}
          <div className="md:hidden flex justify-between items-center mb-6">
             <div className="flex items-center space-x-2">
               <Wallet className="h-6 w-6 text-primary" />
               <h1 className="text-xl font-bold">RupeeLedger</h1>
             </div>
             <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="outline"><Plus /></Button>
              </DialogTrigger>
            </Dialog>
          </div>

          {activeTab === "dashboard" ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-primary">Overview</h2>
                  <p className="text-muted-foreground">Manage your Indian Rupee accounts</p>
                </div>
                
                <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
                  <DialogTrigger asChild>
                    <Button className="hidden md:flex bg-accent text-accent-foreground hover:bg-accent/90">
                      <Plus className="mr-2 h-4 w-4" /> Create Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={addAccount}>
                      <DialogHeader>
                        <DialogTitle>New Account</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Account Name</Label>
                          <Input id="name" name="name" placeholder="e.g. HDFC Savings, Pocket Cash" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Account Type</Label>
                          <Select name="type" defaultValue="Cash">
                            <SelectTrigger>
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Bank">Bank</SelectItem>
                              <SelectItem value="Savings">Savings</SelectItem>
                              <SelectItem value="Business">Business</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="balance">Initial Balance (INR)</Label>
                          <Input id="balance" name="balance" type="number" step="0.01" placeholder="0.00" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full">Create Account</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {accounts.length === 0 ? (
                  <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-card/50">
                    <p className="text-muted-foreground mb-4">No accounts created yet.</p>
                    <Button onClick={() => setIsNewAccountOpen(true)} variant="outline">Get Started</Button>
                  </div>
                ) : (
                  accounts.map((acc) => (
                    <AccountCard 
                      key={acc.id} 
                      account={acc} 
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setActiveTab("ledger");
                      }}
                      isActive={selectedAccountId === acc.id}
                    />
                  ))
                )}
              </div>

              {selectedAccountId && selectedAccount && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <TransactionEntry 
                      account={selectedAccount} 
                      onSuccess={addTransaction} 
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Summary</h3>
                    <div className="bg-card p-6 rounded-lg shadow-sm border space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Recent Activity</span>
                        <Button variant="link" onClick={() => setActiveTab("ledger")} className="h-auto p-0">View All</Button>
                      </div>
                      <div className="space-y-3">
                        {accountTransactions.slice(0, 5).map(t => (
                          <div key={t.id} className="flex justify-between items-center text-sm">
                            <div className="flex items-center">
                              {t.type === 'Credit' ? (
                                <ArrowUpRight className="h-4 w-4 text-green-500 mr-2" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-destructive mr-2" />
                              )}
                              <span className="truncate max-w-[120px]">{t.description}</span>
                            </div>
                            <CurrencyDisplay amount={t.amount} className={t.type === 'Credit' ? 'text-green-600' : 'text-destructive'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-primary">{selectedAccount?.name}</h2>
                  <p className="text-muted-foreground">Full transaction history and ledger</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Select 
                    value={selectedAccountId || ""} 
                    onValueChange={(val) => setSelectedAccountId(val)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Switch Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setActiveTab("dashboard")}>
                    Back to Dashboard
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">Opening Balance</p>
                  <div className="text-2xl font-bold mt-1">
                    <CurrencyDisplay amount={selectedAccount?.initialBalance || 0} />
                  </div>
                </div>
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">Current Balance</p>
                  <div className="text-2xl font-bold mt-1 text-primary">
                    <CurrencyDisplay amount={selectedAccount?.currentBalance || 0} />
                  </div>
                </div>
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">Total Transactions</p>
                  <div className="text-2xl font-bold mt-1">
                    {accountTransactions.length}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Credit (In)</TableHead>
                      <TableHead className="text-right">Debit (Out)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Voucher</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transactions recorded for this account.
                        </TableCell>
                      </TableRow>
                    ) : (
                      accountTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(t.date, "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {t.description}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.type === "Credit" ? (
                              <span className="text-green-600 font-semibold">+<CurrencyDisplay amount={t.amount} /></span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.type === "Debit" ? (
                              <span className="text-destructive font-semibold">-<CurrencyDisplay amount={t.amount} /></span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <CurrencyDisplay amount={t.balanceAfter} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setSelectedVoucher({ t, a: selectedAccount! })}
                              className="text-accent hover:text-accent/80 hover:bg-accent/10"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Voucher Modal */}
      <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
        <DialogContent className="max-w-3xl no-print">
          <DialogHeader>
            <DialogTitle>Voucher Preview</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actual Hidden Print Container */}
      <div className="print-only fixed inset-0 z-[9999] bg-white">
         {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} />}
      </div>
    </div>
  );
}

function TransactionEntry({ account, onSuccess }: { account: Account; onSuccess: (data: any) => void }) {
  return (
    <TransactionForm account={account} onSuccess={onSuccess} />
  );
}