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

  const handleTransactionAdd = (data: { accountId: string; type: TransactionType; amount: number; description: string }) => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(7),
      accountId: data.accountId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: Date.now(),
      balanceAfter: 0,
    };
    recalculateData(accounts, [...transactions, newTx]);
    toast({ title: `Recorded for ${accounts.find(a => a.id === data.accountId)?.name}` });
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
    <div className="min-h-screen flex flex-col no-print bg-background text-foreground">
      <Toaster />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground p-6 shadow-xl border-r">
          <div className="flex items-center space-x-3 mb-12">
            <div className="bg-accent p-2 rounded-lg shadow-inner">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">RupeeLedger</h1>
          </div>

          <nav className="space-y-2">
            <Button 
              variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
              className="w-full justify-start font-medium"
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button 
              variant={activeTab === "ledger" ? "secondary" : "ghost"} 
              className="w-full justify-start font-medium"
              onClick={() => setActiveTab("ledger")}
            >
              <History className="mr-2 h-4 w-4" /> Ledger View
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start font-medium"
              onClick={() => setIsDailyReportOpen(true)}
            >
              <CalendarDays className="mr-2 h-4 w-4" /> Daily Reports
            </Button>
            <Button 
              variant={activeTab === "settings" ? "secondary" : "ghost"} 
              className="w-full justify-start font-medium"
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
            <p className="text-[10px] text-primary-foreground/40 text-center">v1.1.0 - Private Ledger</p>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-primary">Accounts Overview</h2>
                  <p className="text-muted-foreground">Monitor and manage your diverse portfolios</p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setIsDailyReportOpen(true)} className="flex-1 sm:flex-none">
                    <CalendarDays className="mr-2 h-4 w-4" /> Reports
                  </Button>
                  <Button onClick={() => setIsNewAccountOpen(true)} className="flex-1 sm:flex-none bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Account
                  </Button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today's Inflow</p>
                    <div className="text-2xl font-bold mt-1 text-green-600">
                      <CurrencyDisplay amount={todayStats.credit} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today's Outflow</p>
                    <div className="text-2xl font-bold mt-1 text-destructive">
                      <CurrencyDisplay amount={todayStats.debit} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm hidden lg:block border-primary/10">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today's Net Change</p>
                    <div className="text-2xl font-bold mt-1">
                      <CurrencyDisplay amount={todayStats.credit - todayStats.debit} showSign />
                    </div>
                  </CardContent>
                </Card>
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

              {accounts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <TransactionForm 
                      accounts={accounts}
                      defaultAccountId={selectedAccountId}
                      onSuccess={handleTransactionAdd} 
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Global Recent Activity</h3>
                    <div className="bg-card p-6 rounded-lg shadow-sm border border-primary/5 space-y-4">
                      {transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No transactions recorded yet.</p>
                      ) : (
                        transactions.sort((a,b) => b.date - a.date).slice(0, 5).map(t => {
                          const acc = accounts.find(a => a.id === t.accountId);
                          return (
                            <div key={t.id} className="flex justify-between items-center text-sm border-b border-muted last:border-0 pb-2">
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-xs text-muted-foreground uppercase tracking-tighter truncate">{acc?.name}</span>
                                <div className="flex items-center">
                                  {t.type === 'Credit' ? (
                                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1 shrink-0" />
                                  ) : (
                                    <ArrowDownLeft className="h-3 w-3 text-destructive mr-1 shrink-0" />
                                  )}
                                  <span className="truncate">{t.description}</span>
                                </div>
                              </div>
                              <CurrencyDisplay amount={t.amount} className={t.type === 'Credit' ? 'text-green-600 ml-2' : 'text-destructive ml-2'} />
                            </div>
                          );
                        })
                      )}
                      <Button variant="link" onClick={() => setActiveTab("ledger")} className="w-full text-xs">View Full Ledgers</Button>
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
                   <p className="text-muted-foreground max-w-md">Choose an account to view its full transaction history, audit trails, and generate professional reports.</p>
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
                   <Button variant="outline" onClick={() => setActiveTab("dashboard")}>Back to Dashboard</Button>
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
                      <p className="text-muted-foreground ml-10 italic">Detailed Transaction Ledger</p>
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
                    <Card className="bg-muted/10 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Opening Balance</p>
                        <div className="text-2xl font-bold mt-1">
                          <CurrencyDisplay amount={selectedAccount?.initialBalance || 0} />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="ring-1 ring-primary/20 border-primary shadow-md">
                      <CardContent className="pt-6">
                        <p className="text-xs text-primary uppercase font-bold tracking-wider">Net Balance</p>
                        <div className="text-2xl font-bold mt-1 text-primary">
                          <CurrencyDisplay amount={selectedAccount?.currentBalance || 0} />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Entries</p>
                        <div className="text-2xl font-bold mt-1">
                          {accountTransactions.length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-card rounded-xl border border-primary/10 shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">Date</TableHead>
                          <TableHead className="font-bold">Description / Narration</TableHead>
                          <TableHead className="text-right font-bold">Credit (In)</TableHead>
                          <TableHead className="text-right font-bold">Debit (Out)</TableHead>
                          <TableHead className="text-right font-bold">Running Balance</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                              No transactions recorded for this account.
                            </TableCell>
                          </TableRow>
                        ) : (
                          accountTransactions.map((t) => (
                            <TableRow key={t.id} className="group hover:bg-muted/30 transition-colors">
                              <TableCell className="font-medium whitespace-nowrap">
                                {format(t.date, "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate text-sm" title={t.description}>
                                {t.description}
                              </TableCell>
                              <TableCell className="text-right">
                                {t.type === "Credit" ? (
                                  <span className="text-green-600 font-semibold">+<CurrencyDisplay amount={t.amount} /></span>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {t.type === "Debit" ? (
                                  <span className="text-destructive font-semibold">-<CurrencyDisplay amount={t.amount} /></span>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary">
                                <CurrencyDisplay amount={t.balanceAfter} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => setSelectedVoucher({ t, a: selectedAccount! })}
                                    className="h-8 w-8 text-accent hover:bg-accent/10"
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
                                        className="text-destructive focus:text-destructive"
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
                  <h2 className="text-3xl font-bold text-primary">System Settings</h2>
                  <p className="text-muted-foreground">Manage data persistence and security</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Data & Backups</CardTitle>
                      <CardDescription>Keep your financial data safe</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                        <div>
                          <p className="font-semibold">Local Backup</p>
                          <p className="text-sm text-muted-foreground">Download all accounts and history as JSON.</p>
                        </div>
                        <Button onClick={handleExportData} size="sm">
                          <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/10">
                        <div>
                          <p className="font-semibold text-destructive">Factory Reset</p>
                          <p className="text-sm text-muted-foreground">Wipe all local data. This action is irreversible.</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => setIsClearDataAlertOpen(true)}>
                          <Trash className="mr-2 h-4 w-4" /> Reset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>About RupeeLedger</CardTitle>
                      <CardDescription>Application details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="space-y-3">
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Build Version</span>
                            <span className="font-bold">1.1.0 Stable</span>
                          </div>
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Storage Engine</span>
                            <span className="font-mono text-xs">browser.localStorage</span>
                          </div>
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Privacy Status</span>
                            <span className="text-green-600 font-bold">Encapsulated</span>
                          </div>
                       </div>
                       <p className="text-xs text-muted-foreground mt-4 italic leading-relaxed">
                         RupeeLedger is designed for absolute privacy. All computations and storage happen entirely within your local browser sandbox.
                       </p>
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
              <DialogTitle>{editingAccount ? "Modify Account" : "Establish New Account"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" name="name" defaultValue={editingAccount?.name} placeholder="e.g. Personal Savings, Corporate ICICI" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Classification</Label>
                <Select name="type" defaultValue={editingAccount?.type || "Cash"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Liquid Cash</SelectItem>
                    <SelectItem value="Bank">Banking Institution</SelectItem>
                    <SelectItem value="Savings">Savings Reserve</SelectItem>
                    <SelectItem value="Business">Enterprise / Trade</SelectItem>
                    <SelectItem value="Other">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Initial Deposit (INR)</Label>
                <Input id="balance" name="balance" type="number" step="0.01" defaultValue={editingAccount?.initialBalance} placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full shadow-sm">
                {editingAccount ? "Apply Changes" : "Initialize Account"}
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
              <DialogTitle>Update Entry Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Entry Classification</Label>
                <Select name="type" defaultValue={editingTransaction?.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit">Credit (Incoming Funds)</SelectItem>
                    <SelectItem value="Debit">Debit (Expenditure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Transaction Amount (INR)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" defaultValue={editingTransaction?.amount} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Particulars / Narration</Label>
                <Input id="description" name="description" defaultValue={editingTransaction?.description} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Confirm Updates</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reports & Vouchers */}
      <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
        <DialogContent className="max-w-3xl no-print">
          <DialogHeader>
            <DialogTitle>Voucher Document</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pt-2">
            {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={(open) => setIsReportOpen(open)}>
        <DialogContent className="max-w-4xl no-print">
          <DialogHeader>
            <DialogTitle>Account Audit Statement</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            {selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDailyReportOpen} onOpenChange={setIsDailyReportOpen}>
        <DialogContent className="max-w-4xl no-print">
          <DialogHeader>
            <DialogTitle>Chronological Daily Ledger</DialogTitle>
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
            <AlertDialogTitle>Permanent Account Removal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will purge the account and its entire transaction lineage. This action is terminal and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Execute Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing this entry will trigger an immediate recalibration of the running balance for all subsequent records in this ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Execute Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearDataAlertOpen} onOpenChange={setIsClearDataAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-destructive" />
               Complete Data Eradication?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This protocol will permanently eliminate every account, entry, and preference from this device's memory. 
              <strong> You have been warned.</strong> It is recommended to export a backup before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Eradication
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
