
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  LayoutDashboard, 
  History, 
  Settings as SettingsIcon,
  FileText,
  Printer,
  Pencil,
  Trash2,
  MoreVertical,
  ChevronLeft,
  CalendarDays,
  AlertTriangle,
  Download,
  Trash
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
import { format, isSameDay } from "date-fns";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { VoucherPrint } from "@/components/VoucherPrint";
import { ReportPrint } from "@/components/ReportPrint";
import { DailyReport } from "@/components/DailyReport";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RupeeLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger" | "settings">("dashboard");
  
  // Modals state
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<{t: Transaction, a: Account} | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isClearDataAlertOpen, setIsClearDataAlertOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    const savedAccounts = localStorage.getItem("rupee_ledger_accounts");
    const savedTransactions = localStorage.getItem("rupee_ledger_transactions");
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (accounts.length > 0 || transactions.length > 0) {
      localStorage.setItem("rupee_ledger_accounts", JSON.stringify(accounts));
      localStorage.setItem("rupee_ledger_transactions", JSON.stringify(transactions));
    }
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
    localStorage.setItem("rupee_ledger_accounts", JSON.stringify(finalAccounts));
    localStorage.setItem("rupee_ledger_transactions", JSON.stringify(updatedTransactions));
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
      balanceAfter: 0,
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

  const handleClearAllData = () => {
    setAccounts([]);
    setTransactions([]);
    setSelectedAccountId(null);
    localStorage.removeItem("rupee_ledger_accounts");
    localStorage.removeItem("rupee_ledger_transactions");
    setActiveTab("dashboard");
    setIsClearDataAlertOpen(false);
    toast({ title: "All data cleared successfully" });
  };

  const handleExportData = () => {
    const data = { accounts, transactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rupee-ledger-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    link.click();
    toast({ title: "Backup file downloaded" });
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  
  const accountTransactions = useMemo(() => 
    transactions
      .filter(t => t.accountId === selectedAccountId)
      .sort((a, b) => b.date - a.date),
    [transactions, selectedAccountId]
  );

  const todayStats = useMemo(() => {
    return transactions
      .filter(t => isSameDay(new Date(t.date), new Date()))
      .reduce((acc, t) => {
        if (t.type === 'Credit') acc.credit += t.amount;
        else acc.debit += t.amount;
        return acc;
      }, { credit: 0, debit: 0 });
  }, [transactions]);

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
            >
              <History className="mr-2 h-4 w-4" /> Ledger View
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => setIsDailyReportOpen(true)}
            >
              <CalendarDays className="mr-2 h-4 w-4" /> Daily Reports
            </Button>
            <Button 
              variant={activeTab === "settings" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("settings")}
            >
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </Button>
          </nav>

          <div className="mt-auto pt-6 border-t border-primary-foreground/10">
            <div className="mb-4">
              <p className="text-xs uppercase text-primary-foreground/60 font-semibold mb-1">Total Net Worth</p>
              <div className="text-xl font-bold">
                <CurrencyDisplay amount={totalBalance} />
              </div>
            </div>
            <p className="text-[10px] text-primary-foreground/40 text-center">v1.0.2 - Local Only</p>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-primary">Accounts</h2>
                  <p className="text-muted-foreground">Monitor your financial pulse</p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setIsDailyReportOpen(true)} className="flex-1 sm:flex-none">
                    <CalendarDays className="mr-2 h-4 w-4" /> Daily Summary
                  </Button>
                  <Button onClick={() => setIsNewAccountOpen(true)} className="flex-1 sm:flex-none bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="mr-2 h-4 w-4" /> Create Account
                  </Button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today's Inflow</p>
                  <div className="text-2xl font-bold mt-1 text-green-600">
                    <CurrencyDisplay amount={todayStats.credit} />
                  </div>
                </div>
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today's Outflow</p>
                  <div className="text-2xl font-bold mt-1 text-destructive">
                    <CurrencyDisplay amount={todayStats.debit} />
                  </div>
                </div>
                <div className="bg-card p-6 rounded-xl border shadow-sm hidden lg:block">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today's Net</p>
                  <div className="text-2xl font-bold mt-1">
                    <CurrencyDisplay amount={todayStats.credit - todayStats.debit} showSign />
                  </div>
                </div>
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
          )}

          {activeTab === "ledger" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
               {!selectedAccountId ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                   <div className="bg-muted p-6 rounded-full">
                     <History className="h-12 w-12 text-muted-foreground" />
                   </div>
                   <h2 className="text-2xl font-bold">Select an Account</h2>
                   <p className="text-muted-foreground max-w-md">Choose an account from the dashboard or use the selector below to view its full transaction history and generate reports.</p>
                   <div className="w-full max-w-xs pt-4">
                    <Select onValueChange={(val) => setSelectedAccountId(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose Account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                   </div>
                   <Button variant="outline" onClick={() => setActiveTab("dashboard")}>Go to Dashboard</Button>
                 </div>
               ) : (
                 <>
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
                 </>
               )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
               <div>
                  <h2 className="text-3xl font-bold text-primary">Settings</h2>
                  <p className="text-muted-foreground">Manage your application data and preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Data Management</CardTitle>
                      <CardDescription>Control your local database</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-semibold">Backup Data</p>
                          <p className="text-sm text-muted-foreground">Download all accounts and transactions as JSON.</p>
                        </div>
                        <Button onClick={handleExportData}>
                          <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                        <div>
                          <p className="font-semibold text-destructive">Clear All Data</p>
                          <p className="text-sm text-muted-foreground">Permanently delete everything. This cannot be undone.</p>
                        </div>
                        <Button variant="destructive" onClick={() => setIsClearDataAlertOpen(true)}>
                          <Trash className="mr-2 h-4 w-4" /> Clear All
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>App Information</CardTitle>
                      <CardDescription>About RupeeLedger</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="space-y-2">
                          <p className="text-sm"><strong>Version:</strong> 1.0.2 Stable</p>
                          <p className="text-sm"><strong>Storage:</strong> Local Browser Storage (localStorage)</p>
                          <p className="text-sm"><strong>Privacy:</strong> No data leaves your device. Everything is stored locally.</p>
                       </div>
                       <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground italic">Developed with Next.js, Tailwind, and ShadCN.</p>
                       </div>
                    </CardContent>
                  </Card>
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

      <Dialog open={isReportOpen} onOpenChange={isReportOpen}>
        <DialogContent className="max-w-4xl no-print">
          <DialogHeader>
            <DialogTitle>Account Statement</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            {selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDailyReportOpen} onOpenChange={setIsDailyReportOpen}>
        <DialogContent className="max-w-4xl no-print">
          <DialogHeader>
            <DialogTitle>Daily Transaction Report</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            <DailyReport transactions={transactions} accounts={accounts} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerts */}
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

      <AlertDialog open={isClearDataAlertOpen} onOpenChange={setIsClearDataAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-destructive" />
               Clear All Application Data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove all accounts, transactions, and settings from your browser. 
              <strong> You cannot undo this.</strong> We recommend exporting a backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Clear Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print-only containers */}
      <div className="print-only fixed inset-0 z-[9999] bg-white overflow-visible">
         {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} />}
         {isReportOpen && selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} />}
         {isDailyReportOpen && <DailyReport transactions={transactions} accounts={accounts} />}
      </div>
    </div>
  );
}
