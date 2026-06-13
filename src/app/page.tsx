"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  LayoutDashboard, 
  History, 
  Settings,
  FileText,
  Printer,
  Pencil,
  Trash2,
  MoreVertical,
  ChevronLeft
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
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { VoucherPrint } from "@/components/VoucherPrint";
import { ReportPrint } from "@/components/ReportPrint";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RupeeLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger">("dashboard");
  
  // Modals state
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<{t: Transaction, a: Account} | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    const savedAccounts = localStorage.getItem("rupee_ledger_accounts");
    const savedTransactions = localStorage.getItem("rupee_ledger_transactions");
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("rupee_ledger_accounts", JSON.stringify(accounts));
    localStorage.setItem("rupee_ledger_transactions", JSON.stringify(transactions));
  }, [accounts, transactions]);

  // Recalculate helper
  const recalculateData = (updatedAccounts: Account[], updatedTransactions: Transaction[]) => {
    const finalAccounts = updatedAccounts.map(acc => {
      const accTransactions = updatedTransactions
        .filter(t => t.accountId === acc.id)
        .sort((a, b) => a.date - b.date);

      let runningBalance = acc.initialBalance;
      const recalculateTxs = accTransactions.map(t => {
        runningBalance = t.type === 'Credit' ? runningBalance + t.amount : runningBalance - t.amount;
        return { ...t, balanceAfter: runningBalance };
      });

      // Update the transaction pool for this account
      updatedTransactions = [
        ...updatedTransactions.filter(t => t.accountId !== acc.id),
        ...recalculateTxs
      ];

      return { ...acc, currentBalance: runningBalance };
    });

    setAccounts(finalAccounts);
    setTransactions(updatedTransactions);
  };

  const handleAccountSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const type = formData.get("type") as AccountType;
    const initialBalance = parseFloat(formData.get("balance") as string) || 0;

    if (editingAccount) {
      const updatedAccounts = accounts.map(a => 
        a.id === editingAccount.id ? { ...a, name, type, initialBalance } : a
      );
      recalculateData(updatedAccounts, transactions);
      setEditingAccount(null);
      toast({ title: "Account updated" });
    } else {
      const newAccount: Account = {
        id: Math.random().toString(36).substring(7),
        name,
        type,
        initialBalance,
        currentBalance: initialBalance,
        createdAt: Date.now(),
      };
      setAccounts([...accounts, newAccount]);
      setIsNewAccountOpen(false);
      toast({ title: "Account created" });
    }
  };

  const deleteAccount = () => {
    if (!accountToDelete) return;
    const updatedAccounts = accounts.filter(a => a.id !== accountToDelete);
    const updatedTransactions = transactions.filter(t => t.accountId !== accountToDelete);
    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    if (selectedAccountId === accountToDelete) setSelectedAccountId(null);
    setAccountToDelete(null);
    toast({ title: "Account deleted" });
  };

  const handleTransactionAdd = (data: { type: TransactionType; amount: number; description: string }) => {
    if (!selectedAccountId) return;
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(7),
      accountId: selectedAccountId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: Date.now(),
      balanceAfter: 0, // Will be calculated
    };
    recalculateData(accounts, [...transactions, newTx]);
    toast({ title: "Transaction recorded" });
  };

  const handleTransactionEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const type = formData.get("type") as TransactionType;
    const description = formData.get("description") as string;

    const updatedTransactions = transactions.map(t => 
      t.id === editingTransaction.id ? { ...t, amount, type, description } : t
    );
    recalculateData(accounts, updatedTransactions);
    setEditingTransaction(null);
    toast({ title: "Transaction updated" });
  };

  const deleteTransaction = () => {
    if (!transactionToDelete) return;
    const updatedTransactions = transactions.filter(t => t.id !== transactionToDelete);
    recalculateData(accounts, updatedTransactions);
    setTransactionToDelete(null);
    toast({ title: "Transaction deleted" });
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const accountTransactions = useMemo(() => 
    transactions
      .filter(t => t.accountId === selectedAccountId)
      .sort((a, b) => b.date - a.date),
    [transactions, selectedAccountId]
  );

  return (
    <div className="min-h-screen flex flex-col no-print bg-background">
      <Toaster />
      
      <div className="flex flex-1">
        {/* Sidebar */}
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

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {activeTab === "dashboard" ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-primary">Accounts</h2>
                  <p className="text-muted-foreground">Monitor your financial pulse</p>
                </div>
                
                <Button onClick={() => setIsNewAccountOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="mr-2 h-4 w-4" /> Create Account
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {accounts.length === 0 ? (
                  <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-card/50">
                    <p className="text-muted-foreground mb-4">No accounts yet. Start by creating one.</p>
                    <Button onClick={() => setIsNewAccountOpen(true)} variant="outline">Create My First Account</Button>
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
                      onEdit={setEditingAccount}
                      onDelete={setAccountToDelete}
                      isActive={selectedAccountId === acc.id}
                    />
                  ))
                )}
              </div>

              {selectedAccountId && selectedAccount && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <TransactionForm 
                      account={selectedAccount} 
                      onSuccess={handleTransactionAdd} 
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Recent Activity</h3>
                    <div className="bg-card p-6 rounded-lg shadow-sm border space-y-4">
                      {accountTransactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No transactions recorded yet.</p>
                      ) : (
                        accountTransactions.slice(0, 5).map(t => (
                          <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                            <div className="flex items-center min-w-0">
                              {t.type === 'Credit' ? (
                                <ArrowUpRight className="h-4 w-4 text-green-500 mr-2 shrink-0" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-destructive mr-2 shrink-0" />
                              )}
                              <span className="truncate">{t.description}</span>
                            </div>
                            <CurrencyDisplay amount={t.amount} className={t.type === 'Credit' ? 'text-green-600 ml-2' : 'text-destructive ml-2'} />
                          </div>
                        ))
                      )}
                      <Button variant="link" onClick={() => setActiveTab("ledger")} className="w-full text-xs">View Full Ledger</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Button variant="ghost" size="icon" onClick={() => setActiveTab("dashboard")} className="h-8 w-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-3xl font-bold text-primary">{selectedAccount?.name}</h2>
                  </div>
                  <p className="text-muted-foreground ml-10">Ledger Statement</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setIsReportOpen(true)}>
                    <Printer className="mr-2 h-4 w-4" /> Full Report
                  </Button>
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Opening Balance</p>
                  <div className="text-2xl font-bold mt-1">
                    <CurrencyDisplay amount={selectedAccount?.initialBalance || 0} />
                  </div>
                </div>
                <div className="bg-card p-6 rounded-lg border shadow-sm ring-1 ring-primary/10">
                  <p className="text-xs text-primary uppercase font-bold tracking-wider">Current Balance</p>
                  <div className="text-2xl font-bold mt-1 text-primary">
                    <CurrencyDisplay amount={selectedAccount?.currentBalance || 0} />
                  </div>
                </div>
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Transactions</p>
                  <div className="text-2xl font-bold mt-1">
                    {accountTransactions.length}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Credit (In)</TableHead>
                      <TableHead className="text-right">Debit (Out)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                          No transactions recorded. Use the dashboard to add entries.
                        </TableCell>
                      </TableRow>
                    ) : (
                      accountTransactions.map((t) => (
                        <TableRow key={t.id} className="group">
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(t.date, "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate" title={t.description}>
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
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => setSelectedVoucher({ t, a: selectedAccount! })}
                                className="h-8 w-8 text-accent"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingTransaction(t)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setTransactionToDelete(t.id)} 
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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

      {/* Account Modals */}
      <Dialog open={isNewAccountOpen || !!editingAccount} onOpenChange={(open) => {
        if (!open) {
          setIsNewAccountOpen(false);
          setEditingAccount(null);
        }
      }}>
        <DialogContent>
          <form onSubmit={handleAccountSubmit}>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit Account" : "New Account"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input id="name" name="name" defaultValue={editingAccount?.name} placeholder="e.g. HDFC Bank, My Wallet" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <Select name="type" defaultValue={editingAccount?.type || "Cash"}>
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
                <Input id="balance" name="balance" type="number" step="0.01" defaultValue={editingAccount?.initialBalance} placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                {editingAccount ? "Update Account" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Edit Modal */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent>
          <form onSubmit={handleTransactionEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select name="type" defaultValue={editingTransaction?.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit">Credit (Incoming)</SelectItem>
                    <SelectItem value="Debit">Debit (Outgoing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" defaultValue={editingTransaction?.amount} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={editingTransaction?.description} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reports & Vouchers */}
      <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
        <DialogContent className="max-w-3xl no-print">
          <DialogHeader>
            <DialogTitle>Voucher Preview</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-4xl no-print">
          <DialogHeader>
            <DialogTitle>Account Statement</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            {selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alerts */}
      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account and ALL its transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this transaction and recalculate the running balance for all subsequent entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print-only containers */}
      <div className="print-only fixed inset-0 z-[9999] bg-white overflow-visible">
         {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} />}
         {isReportOpen && selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} />}
      </div>
    </div>
  );
}
