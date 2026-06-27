"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
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
  Trash,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Account, Transaction, AccountType, TransactionType, BusinessProfile, Subscription, SecuritySettings, UserProfile } from "@/lib/types";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
// Removed Firestore imports to migrate fully to MongoDB API endpoints
import { AccountCard } from "@/components/AccountCard";
import { TransactionForm } from "@/components/TransactionForm";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
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
import { format, isSameDay, parse, addDays } from "date-fns";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { VoucherPrint } from "@/components/VoucherPrint";
import { ReportPrint } from "@/components/ReportPrint";
import { DailyReport } from "@/components/DailyReport";
import { GSTReportTab } from "@/components/GSTReportTab";
import { InvoicePrint } from "@/components/InvoicePrint";
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
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

async function hashPin(pin: string, userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "_rupee_ledger_salt_" + userId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function migrateSecuritySettings(sec: SecuritySettings, userId: string): Promise<SecuritySettings> {
  if (sec.pinCode && sec.pinCode.length === 4 && !sec.hashedPinCode) {
    try {
      const hash = await hashPin(sec.pinCode, userId);
      return {
        ...sec,
        pinCode: "",
        hashedPinCode: hash
      };
    } catch (err) {
      console.error("Failed to migrate security PIN:", err);
    }
  }
  return sec;
}


async function pushSyncToMongoDB(
  userId: string,
  accountsList: Account[],
  transactionsList: Transaction[],
  businessProfile?: BusinessProfile,
  subscription?: Subscription,
  securitySettings?: SecuritySettings
) {
  try {
    const res = await fetch('/api/ledger/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        accounts: accountsList,
        transactions: transactionsList,
        businessProfile,
        subscription,
        securitySettings,
        action: 'push'
      })
    });
    if (!res.ok) {
      throw new Error(`Sync request failed with status ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("MongoDB backup sync error:", err);
    throw err;
  }
}

export default function RupeeLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger" | "analytics" | "gst" | "settings">("dashboard");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStartDate, setLedgerStartDate] = useState("");
  const [ledgerEndDate, setLedgerEndDate] = useState("");
  const [analyticsAccountId, setAnalyticsAccountId] = useState<string>("all");
  
  // Modals state
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [newAccountContext, setNewAccountContext] = useState<'buyer' | 'company'>('company');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<{t: Transaction, a: Account} | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<{t: Transaction, a: Account} | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isClearDataAlertOpen, setIsClearDataAlertOpen] = useState(false);
  const [boughtKey, setBoughtKey] = useState<{ key: string, duration: string } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dailyReportDateInput, setDailyReportDateInput] = useState<string>(
    format(new Date(), "dd-MM-yyyy")
  );

  const dailyReportDate = useMemo(() => {
    const parsed = parse(dailyReportDateInput, "dd-MM-yyyy", new Date());
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [dailyReportDateInput]);

  const [dailyReportMode, setDailyReportMode] = useState<"daily" | "monthly">("daily");
  const [dailyReportMonth, setDailyReportMonth] = useState<number>(new Date().getMonth());
  const [dailyReportYear, setDailyReportYear] = useState<number>(new Date().getFullYear());

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    companyName: "",
    address: "",
    gstin: "",
    phone: "",
    printFooter: ""
  });

  const [subscription, setSubscription] = useState<Subscription>({
    status: "active",
    plan: "Free Trial (7 Days)",
    price: "₹199 / month",
    renewalDate: format(addDays(new Date(), 7), "dd-MM-yyyy"),
    licenseKey: "FREE-TRIAL",
    purchasedAt: Date.now()
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    pinEnabled: false,
    pinCode: ""
  });

  // Authentication States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [loginTab, setLoginTab] = useState<"google" | "phone" | "email" | "whatsapp">("google");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");

  // WhatsApp OTP states
  const [whatsappInput, setWhatsappInput] = useState("");
  const [whatsappOtpInput, setWhatsappOtpInput] = useState("");
  const [whatsappOtpSent, setWhatsappOtpSent] = useState(false);
  const [whatsappOtpLoading, setWhatsappOtpLoading] = useState(false);
  const [whatsappGeneratedOtp, setWhatsappGeneratedOtp] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [cloudBackupEnabled, setCloudBackupEnabled] = useState(true);
  // Email OTP login states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  // Guest upgrade modal states
  const [showGuestUpgradeModal, setShowGuestUpgradeModal] = useState(false);
  const [guestUpgradeEmail, setGuestUpgradeEmail] = useState("");
  const [guestUpgradeOtpSent, setGuestUpgradeOtpSent] = useState(false);
  const [guestUpgradeOtp, setGuestUpgradeOtp] = useState("");
  const [guestUpgradeDevOtp, setGuestUpgradeDevOtp] = useState("");
  const [guestUpgradeLoading, setGuestUpgradeLoading] = useState(false);
  const [emailLoginMode, setEmailLoginMode] = useState<"otp" | "password">("otp");

  const [isLocked, setIsLocked] = useState(false);

  // Reseller / Key Generation States
  const [vendorKeyDuration, setVendorKeyDuration] = useState<"monthly" | "annual">("annual");
  const [generatedKeysList, setGeneratedKeysList] = useState<{key: string; duration: string; createdAt: number; status: string}[]>([]);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Owner Authorization Settings
  const OWNER_EMAILS = useMemo(() => [
    "rockyashok7313@gmail.com",
    "ak@rupeeledger.com",
    "admin@rupeeledger.com"
  ], []);

  const isOwner = useMemo(() => {
    return !!(user && user.authMethod !== 'guest' && user.email && 
      OWNER_EMAILS.includes(user.email.toLowerCase()));
  }, [user, OWNER_EMAILS]);

  const loadLocalStorageData = async (guestUserId: string = "guest_local") => {
    let savedAccounts = localStorage.getItem(`rupee_ledger_accounts_${guestUserId}`);
    let savedTransactions = localStorage.getItem(`rupee_ledger_transactions_${guestUserId}`);
    
    // Backward compatibility fallback
    if (!savedAccounts && guestUserId === "guest_local") {
      savedAccounts = localStorage.getItem("rupee_ledger_accounts");
    }
    if (!savedTransactions && guestUserId === "guest_local") {
      savedTransactions = localStorage.getItem("rupee_ledger_transactions");
    }

    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    else setAccounts([]);
    
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    else setTransactions([]);

    const savedCloudBackup = localStorage.getItem("rupee_ledger_cloud_backup_enabled");
    if (savedCloudBackup !== null) {
      setCloudBackupEnabled(JSON.parse(savedCloudBackup));
    }

    const savedProfile = localStorage.getItem("rupee_ledger_business_profile");
    if (savedProfile) setBusinessProfile(JSON.parse(savedProfile));

    const savedSub = localStorage.getItem("rupee_ledger_subscription");
    if (savedSub) {
      const parsedSub = JSON.parse(savedSub);
      // Migrate old pricing to new pricing
      if (parsedSub.price === '₹500 / month' || parsedSub.price === '₹500/month') parsedSub.price = '₹199 / month';
      if (parsedSub.price === '₹5,000 / year' || parsedSub.price === '₹5000 / year') parsedSub.price = '₹1,999 / year';
      setSubscription(parsedSub);
    }

    const savedSecurity = localStorage.getItem("rupee_ledger_security");
    if (savedSecurity) {
      const parsedSec = JSON.parse(savedSecurity);
      const migrated = await migrateSecuritySettings(parsedSec, guestUserId);
      setSecuritySettings(migrated);
      if (migrated.pinEnabled && (migrated.hashedPinCode || migrated.pinCode)) {
        setIsLocked(true);
      }
    }
  };

  useEffect(() => {
    // 1. Setup Auth Observer
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        toast({ title: "Syncing with cloud...", description: "Fetching ledger database." });
        try {
          // Fetch user data via MongoDB Sync API route
          const syncRes = await fetch('/api/ledger/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: firebaseUser.uid, action: 'pull' })
          });

          let shouldLock = false;
          let fetchedAccounts: Account[] = [];
          let fetchedTxs: Transaction[] = [];

          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.isOfflineFallback) {
              await loadLocalStorageData(firebaseUser.uid);
            } else {
              if (syncData.exists) {
                if (syncData.businessProfile) setBusinessProfile(syncData.businessProfile);
                if (syncData.subscription) {
                  const s = syncData.subscription;
                  if (s.price === '₹500 / month') s.price = '₹199 / month';
                  if (s.price === '₹5,000 / year') s.price = '₹1,999 / year';
                  setSubscription(s);
                }
                if (syncData.securitySettings) {
                  const migrated = await migrateSecuritySettings(syncData.securitySettings, firebaseUser.uid);
                  setSecuritySettings(migrated);
                  if (migrated.pinEnabled && (migrated.hashedPinCode || migrated.pinCode)) {
                    shouldLock = true;
                  }
                }
                fetchedAccounts = syncData.accounts || [];
                fetchedTxs = syncData.transactions || [];
              } else {
                const initialSubscription: Subscription = {
                  status: "active",
                  plan: "Free Trial (7 Days)",
                  price: "₹199 / month",
                  renewalDate: format(addDays(new Date(), 7), "dd-MM-yyyy"),
                  licenseKey: "FREE-TRIAL",
                  purchasedAt: Date.now()
                };
                setSubscription(initialSubscription);
                await pushSyncToMongoDB(
                  firebaseUser.uid,
                  [],
                  [],
                  businessProfile,
                  initialSubscription,
                  securitySettings
                );
              }
            }
          } else {
            await loadLocalStorageData(firebaseUser.uid);
          }

          // Auto-migration check: If cloud database is empty, check for local data
          if (fetchedAccounts.length === 0 && fetchedTxs.length === 0) {
            const guestAccs = localStorage.getItem(`rupee_ledger_accounts_${firebaseUser.uid}`) ||
                              localStorage.getItem("rupee_ledger_accounts_guest_local") || 
                              localStorage.getItem("rupee_ledger_accounts_");
            const guestTxs = localStorage.getItem(`rupee_ledger_transactions_${firebaseUser.uid}`) ||
                              localStorage.getItem("rupee_ledger_transactions_guest_local") || 
                              localStorage.getItem("rupee_ledger_transactions_");
            
            if (guestAccs || guestTxs) {
              const parsedAccs: Account[] = guestAccs ? JSON.parse(guestAccs) : [];
              const parsedTxs: Transaction[] = guestTxs ? JSON.parse(guestTxs) : [];
              if (parsedAccs.length > 0 || parsedTxs.length > 0) {
                toast({ 
                  title: "Migrating Local Data", 
                  description: `Uploading ${parsedAccs.length} accounts and ${parsedTxs.length} transactions to cloud storage.` 
                });
                await pushSyncToMongoDB(firebaseUser.uid, parsedAccs, parsedTxs, businessProfile, subscription, securitySettings);
                fetchedAccounts = parsedAccs;
                fetchedTxs = parsedTxs;
              }
            }
          }

          setAccounts(fetchedAccounts);
          setTransactions(fetchedTxs);
          await fetchGeneratedKeys(firebaseUser.uid);

          const profile: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Cloud User",
            email: firebaseUser.email || undefined,
            phone: firebaseUser.phoneNumber || undefined,
            avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.email || firebaseUser.uid}`,
            authMethod: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
            createdAt: Date.now()
          };
          setUser(profile);
          setShowLogin(false);
          setIsLocked(shouldLock);
          setPinInput("");
          setIsLoaded(true);
        } catch (err) {
          console.error("MongoDB loading error:", err);
          toast({ title: "Cloud Sync Failure", description: "Loading backup cache from local storage.", variant: "destructive" });
          await loadLocalStorageData(firebaseUser.uid);
          
          const profile: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Cloud User",
            email: firebaseUser.email || undefined,
            phone: firebaseUser.phoneNumber || undefined,
            avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.email || firebaseUser.uid}`,
            authMethod: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
            createdAt: Date.now()
          };
          setUser(profile);
          setShowLogin(false);
          setIsLoaded(true);
        }
      } else {
        const savedUser = localStorage.getItem("rupee_ledger_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed.authMethod === 'guest') {
            setUser(parsed);
            setShowLogin(false);
            await loadLocalStorageData(parsed.id);
            setIsLoaded(true);
            return;
          } else if (parsed.authMethod === 'phone' || parsed.authMethod === 'whatsapp' || parsed.authMethod === 'emailOtp') {
            setUser(parsed);
            setShowLogin(false);
            setIsLocked(false);
            setPinInput("");
            const loadUserData = async () => {
              try {
                toast({ title: "Syncing with cloud...", description: "Fetching ledger database." });
                const syncRes = await fetch('/api/ledger/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: parsed.id, action: 'pull' })
                });
                let shouldLock = false;
                if (syncRes.ok) {
                  const syncData = await syncRes.json();
                  if (syncData.isOfflineFallback) {
                    await loadLocalStorageData(parsed.id);
                  } else if (syncData.exists) {
                    if (syncData.businessProfile) setBusinessProfile(syncData.businessProfile);
                    if (syncData.subscription) {
                      const s = syncData.subscription;
                      if (s.price === '₹500 / month') s.price = '₹199 / month';
                      if (s.price === '₹5,000 / year') s.price = '₹1,999 / year';
                      setSubscription(s);
                    }
                    if (syncData.securitySettings) {
                      const migrated = await migrateSecuritySettings(syncData.securitySettings, parsed.id);
                      setSecuritySettings(migrated);
                      if (migrated.pinEnabled && (migrated.hashedPinCode || migrated.pinCode)) {
                        shouldLock = true;
                      }
                    }
                    setAccounts(syncData.accounts || []);
                    setTransactions(syncData.transactions || []);
                  }
                } else {
                  await loadLocalStorageData(parsed.id);
                }
                
                setIsLocked(shouldLock);
                setIsLoaded(true);
              } catch (err) {
                console.error("MongoDB user loading error on refresh:", err);
                await loadLocalStorageData(parsed.id);
                setIsLoaded(true);
              }
            };
            loadUserData();
            return;
          }
        }
      }
    });
    // 2. Load Razorpay Script dynamically
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      unsubscribe();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const [isTrialExpired, setIsTrialExpired] = useState(false);

  // 7-day free trial plan expiry check for all logins
  useEffect(() => {
    if (!isLoaded || !user) return;
    
    // Check if the user is using a free trial or has no license key
    const isTrial = !subscription.licenseKey || 
                    subscription.licenseKey === "FREE-TRIAL" || 
                    subscription.plan.toLowerCase().includes("trial");

    if (isTrial && subscription.purchasedAt) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - subscription.purchasedAt > sevenDays) {
        setIsTrialExpired(true);
      } else {
        setIsTrialExpired(false);
      }
    } else if (isTrial && !subscription.purchasedAt) {
      // Fallback: If no purchasedAt exists, initialize it to now to start the 7 days trial
      setSubscription(prev => ({
        ...prev,
        purchasedAt: Date.now()
      }));
    } else {
      setIsTrialExpired(false);
    }
  }, [isLoaded, user, subscription]);

  // Sync to local storage

  useEffect(() => {
    if (isLoaded) {
      const storageSuffix = user ? user.id : "guest_local";
      localStorage.setItem(`rupee_ledger_accounts_${storageSuffix}`, JSON.stringify(accounts));
      localStorage.setItem(`rupee_ledger_transactions_${storageSuffix}`, JSON.stringify(transactions));
      localStorage.setItem("rupee_ledger_business_profile", JSON.stringify(businessProfile));
      localStorage.setItem("rupee_ledger_subscription", JSON.stringify(subscription));
      localStorage.setItem("rupee_ledger_security", JSON.stringify(securitySettings));
      localStorage.setItem("rupee_ledger_cloud_backup_enabled", JSON.stringify(cloudBackupEnabled));
      if (user) {
        localStorage.setItem("rupee_ledger_user", JSON.stringify(user));
        // Sync configuration states to MongoDB if logged in and cloud backup is enabled
        if (user.authMethod !== 'guest' && cloudBackupEnabled) {
          const syncConfig = async () => {
            try {
              await pushSyncToMongoDB(
                user.id,
                accounts,
                transactions,
                businessProfile,
                subscription,
                securitySettings
              );
            } catch (err) {
              console.error("MongoDB config sync error:", err);
            }
          };
          syncConfig();
        }
      } else {
        localStorage.removeItem("rupee_ledger_user");
      }
    }
  }, [accounts, transactions, businessProfile, subscription, securitySettings, user, isLoaded, cloudBackupEnabled]);

  // User Authentication Logic
  const handleGuestLogin = () => {
    const guestUser: UserProfile = {
      id: "guest_" + Math.random().toString(36).substring(2, 10),
      name: "Guest User",
      authMethod: "guest",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
      createdAt: Date.now()
    };
    setUser(guestUser);
    setShowLogin(false);
    setIsLocked(false);
    setPinInput("");
    toast({ title: "Logged in as Guest", description: "All data will remain saved locally." });
  };

  const handleGoogleLogin = async () => {
    toast({ title: "Connecting to Google...", description: "Opening Google Auth popup." });
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Auth error:", error);
      toast({
        title: "Google Sign-In Failed",
        description: error instanceof Error ? error.message : "Authentication aborted.",
        variant: "destructive"
      });
    }
  };

  // ── Phone OTP (server-side) ─────────────────────────────────────
  const handleSendOTP = async () => {
    if (!phoneInput || phoneInput.length < 10) {
      toast({ title: "Invalid Phone Number", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/auth/phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, action: 'send' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
      // In dev/demo mode the OTP is returned; store it in generatedOtp for display
      if (data.devOtp) {
        setGeneratedOtp(data.devOtp);
        toast({ title: "OTP Sent (Demo)", description: `Your OTP: ${data.devOtp}` });
      } else {
        setGeneratedOtp("");
        toast({ title: "OTP Sent", description: `SMS sent to +91 ${phoneInput}` });
      }
    } catch (err) {
      toast({ title: "Failed to Send OTP", description: err instanceof Error ? err.message : "Server error.", variant: "destructive" });
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput || otpInput.length < 6) {
      toast({ title: "Enter OTP", description: "Please enter the 6-digit OTP.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/auth/phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, action: 'verify', otp: otpInput })
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'Verification failed.');

      const phoneId = 'p_' + phoneInput;
      const phoneUser: UserProfile = {
        id: phoneId,
        name: `User ${phoneInput.slice(-4)}`,
        phone: phoneInput,
        authMethod: 'phone',
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${phoneInput}`,
        createdAt: Date.now()
      };
      toast({ title: 'Syncing with cloud...', description: 'Fetching ledger database.' });
      try {
        const syncRes = await fetch('/api/ledger/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: phoneId, action: 'pull' })
        });
        let shouldLock = false;
        let fetchedAccounts: Account[] = [];
        let fetchedTxs: Transaction[] = [];

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.isOfflineFallback) {
            await loadLocalStorageData(phoneId);
          } else {
            if (syncData.exists) {
              if (syncData.businessProfile) setBusinessProfile(syncData.businessProfile);
              if (syncData.subscription) setSubscription(syncData.subscription);
              if (syncData.securitySettings) {
                const migrated = await migrateSecuritySettings(syncData.securitySettings, phoneId);
                setSecuritySettings(migrated);
                if (migrated.pinEnabled && (migrated.hashedPinCode || migrated.pinCode)) shouldLock = true;
              }
              fetchedAccounts = syncData.accounts || [];
              fetchedTxs = syncData.transactions || [];
            } else {
              await pushSyncToMongoDB(phoneId, [], [], businessProfile, subscription, securitySettings);
            }
          }
        } else {
          await loadLocalStorageData(phoneId);
        }
        setAccounts(fetchedAccounts);
        setTransactions(fetchedTxs);
        await fetchGeneratedKeys(phoneId);
        setUser(phoneUser);
        setShowLogin(false);
        setIsLocked(shouldLock);
        setPinInput('');
        setOtpSent(false);
        setOtpInput('');
        setPhoneInput('');
        toast({ title: 'Verification Successful', description: 'Your phone number is authenticated.' });
      } catch (err) {
        console.error('MongoDB phone login error:', err);
        setUser(phoneUser);
        setShowLogin(false);
        await loadLocalStorageData(phoneId);
        setOtpSent(false);
        setOtpInput('');
        setPhoneInput('');
      }
    } catch (err) {
      toast({ title: 'Incorrect OTP', description: err instanceof Error ? err.message : 'Verification failed.', variant: 'destructive' });
    }
  };

  // ── WhatsApp OTP (server-side) ──────────────────────────────────
  const handleSendWhatsappOTP = async () => {
    if (!whatsappInput || whatsappInput.length < 10) {
      toast({ title: "Invalid Phone Number", description: "Please enter a valid 10-digit WhatsApp number.", variant: "destructive" });
      return;
    }
    setWhatsappOtpLoading(true);
    try {
      const res = await fetch('/api/auth/whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsappInput, action: 'send' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWhatsappOtpSent(true);
      if (data.devOtp) {
        setWhatsappGeneratedOtp(data.devOtp);
        toast({ title: "WhatsApp OTP Sent (Demo)", description: `Your OTP: ${data.devOtp}` });
      } else {
        setWhatsappGeneratedOtp("");
        toast({ title: "WhatsApp OTP Sent", description: `OTP sent to WhatsApp +91 ${whatsappInput}` });
      }
    } catch (err) {
      toast({ title: "Failed to Send OTP", description: err instanceof Error ? err.message : "Server error.", variant: "destructive" });
    } finally {
      setWhatsappOtpLoading(false);
    }
  };

  const handleVerifyWhatsappOTP = async () => {
    if (!whatsappOtpInput || whatsappOtpInput.length < 6) {
      toast({ title: "Enter OTP", description: "Please enter the 6-digit OTP.", variant: "destructive" });
      return;
    }
    setWhatsappOtpLoading(true);
    try {
      const res = await fetch('/api/auth/whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsappInput, action: 'verify', otp: whatsappOtpInput })
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'Verification failed.');

      const phoneId = 'p_' + whatsappInput;
      const whatsappUser: UserProfile = {
        id: phoneId,
        name: `User ${whatsappInput.slice(-4)}`,
        phone: whatsappInput,
        authMethod: 'whatsapp',
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${whatsappInput}`,
        createdAt: Date.now()
      };
      toast({ title: 'Syncing with cloud...', description: 'Fetching ledger database.' });
      try {
        const syncRes = await fetch('/api/ledger/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: phoneId, action: 'pull' })
        });
        let shouldLock = false;
        let fetchedAccounts: Account[] = [];
        let fetchedTxs: Transaction[] = [];

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.isOfflineFallback) {
            await loadLocalStorageData(phoneId);
          } else {
            if (syncData.exists) {
              if (syncData.businessProfile) setBusinessProfile(syncData.businessProfile);
              if (syncData.subscription) setSubscription(syncData.subscription);
              if (syncData.securitySettings) {
                const migrated = await migrateSecuritySettings(syncData.securitySettings, phoneId);
                setSecuritySettings(migrated);
                if (migrated.pinEnabled && (migrated.hashedPinCode || migrated.pinCode)) shouldLock = true;
              }
              fetchedAccounts = syncData.accounts || [];
              fetchedTxs = syncData.transactions || [];
            } else {
              await pushSyncToMongoDB(phoneId, [], [], businessProfile, subscription, securitySettings);
            }
          }
        } else {
          await loadLocalStorageData(phoneId);
        }
        setAccounts(fetchedAccounts);
        setTransactions(fetchedTxs);
        await fetchGeneratedKeys(phoneId);
        setUser(whatsappUser);
        setShowLogin(false);
        setIsLocked(shouldLock);
        setPinInput('');
        setWhatsappOtpSent(false);
        setWhatsappOtpInput('');
        setWhatsappInput('');
      } catch (err) {
        console.error('MongoDB whatsapp login error:', err);
        setUser(whatsappUser);
        setShowLogin(false);
        await loadLocalStorageData(phoneId);
        setWhatsappOtpSent(false);
        setWhatsappOtpInput('');
        setWhatsappInput('');
        toast({ title: 'Verification Successful', description: 'Your WhatsApp number is authenticated.' });
      }
    } catch (err) {
      toast({ title: 'Incorrect OTP', description: err instanceof Error ? err.message : 'Verification failed.', variant: 'destructive' });
    } finally {
      setWhatsappOtpLoading(false);
    }
  };

  // ── Email OTP login ──────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setEmailOtpLoading(true);
    try {
      const res = await fetch('/api/auth/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, action: 'send' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmailOtpSent(true);
      if (data.devOtp) {
        toast({ title: 'OTP Sent (Demo)', description: `Your OTP: ${data.devOtp}` });
      } else {
        toast({ title: 'OTP Sent', description: `Check your inbox at ${emailInput}` });
      }
    } catch (err) {
      toast({ title: 'Failed to Send OTP', description: err instanceof Error ? err.message : 'Server error.', variant: 'destructive' });
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpInput || emailOtpInput.length < 6) {
      toast({ title: 'Enter OTP', description: 'Please enter the 6-digit OTP.', variant: 'destructive' });
      return;
    }
    setEmailOtpLoading(true);
    try {
      const res = await fetch('/api/auth/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, action: 'verify', otp: emailOtpInput })
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'Verification failed.');

      const emailId = 'e_' + emailInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const emailUser: UserProfile = {
        id: emailId,
        name: emailInput.split('@')[0],
        email: emailInput.trim().toLowerCase(),
        authMethod: 'emailOtp',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${emailInput}`,
        createdAt: Date.now()
      };
      toast({ title: 'Syncing with cloud...', description: 'Fetching ledger database.' });
      try {
        const syncRes = await fetch('/api/ledger/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: emailId, action: 'pull' })
        });
        let shouldLock = false;
        let fetchedAccounts: Account[] = [];
        let fetchedTxs: Transaction[] = [];

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.isOfflineFallback) {
            await loadLocalStorageData(emailId);
          } else {
            if (syncData.exists) {
              if (syncData.businessProfile) setBusinessProfile(syncData.businessProfile);
              if (syncData.subscription) setSubscription(syncData.subscription);
              if (syncData.securitySettings) {
                const migrated = await migrateSecuritySettings(syncData.securitySettings, emailId);
                setSecuritySettings(migrated);
                if (migrated.pinEnabled && (migrated.hashedPinCode || migrated.pinCode)) shouldLock = true;
              }
              fetchedAccounts = syncData.accounts || [];
              fetchedTxs = syncData.transactions || [];
            } else {
              await pushSyncToMongoDB(emailId, [], [], businessProfile, subscription, securitySettings);
            }
          }
        } else {
          await loadLocalStorageData(emailId);
        }
        setAccounts(fetchedAccounts);
        setTransactions(fetchedTxs);
        await fetchGeneratedKeys(emailId);
        setUser(emailUser);
        setShowLogin(false);
        setIsLocked(shouldLock);
        setPinInput('');
        setEmailOtpSent(false);
        setEmailOtpInput('');
        setEmailInput('');
        toast({ title: 'Welcome!', description: `Signed in as ${emailUser.email}` });
      } catch (err) {
        console.error('MongoDB email OTP login error:', err);
        setUser(emailUser);
        setShowLogin(false);
        await loadLocalStorageData(emailId);
        setEmailOtpSent(false);
        setEmailOtpInput('');
        setEmailInput('');
      }
    } catch (err) {
      toast({ title: 'Incorrect OTP', description: err instanceof Error ? err.message : 'Verification failed.', variant: 'destructive' });
    } finally {
      setEmailOtpLoading(false);
    }
  };

  // ── Guest account upgrade (email linkage) ────────────────────────
  const handleSendGuestUpgradeOtp = async () => {
    if (!guestUpgradeEmail || !guestUpgradeEmail.includes('@')) {
      toast({ title: 'Invalid Email', description: 'Enter a valid email to link your account.', variant: 'destructive' });
      return;
    }
    setGuestUpgradeLoading(true);
    try {
      const res = await fetch('/api/auth/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guestUpgradeEmail, action: 'send' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGuestUpgradeOtpSent(true);
      if (data.devOtp) {
        setGuestUpgradeDevOtp(data.devOtp);
        toast({ title: 'OTP Sent (Demo)', description: `Your OTP: ${data.devOtp}` });
      } else {
        setGuestUpgradeDevOtp('');
        toast({ title: 'OTP Sent', description: `Check your inbox at ${guestUpgradeEmail}` });
      }
    } catch (err) {
      toast({ title: 'Failed to Send OTP', description: err instanceof Error ? err.message : 'Server error.', variant: 'destructive' });
    } finally {
      setGuestUpgradeLoading(false);
    }
  };

  const handleVerifyGuestUpgrade = async () => {
    if (!guestUpgradeOtp || guestUpgradeOtp.length < 6) {
      toast({ title: 'Enter OTP', description: 'Please enter the 6-digit OTP.', variant: 'destructive' });
      return;
    }
    setGuestUpgradeLoading(true);
    try {
      const res = await fetch('/api/auth/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guestUpgradeEmail, action: 'verify', otp: guestUpgradeOtp })
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'Verification failed.');

      const emailId = 'e_' + guestUpgradeEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const upgradedUser: UserProfile = {
        id: emailId,
        name: guestUpgradeEmail.split('@')[0],
        email: guestUpgradeEmail.trim().toLowerCase(),
        authMethod: 'emailOtp',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${guestUpgradeEmail}`,
        createdAt: Date.now()
      };

      // Migrate local guest data to cloud
      toast({ title: 'Linking Account...', description: 'Migrating your ledger data to cloud.' });
      try {
        await pushSyncToMongoDB(emailId, accounts, transactions, businessProfile, subscription, securitySettings);
        toast({ title: 'Account Linked!', description: `Your ledger is now saved under ${guestUpgradeEmail}` });
      } catch (err) {
        console.error('Guest migration error:', err);
        toast({ title: 'Cloud Sync Failed', description: 'Data kept locally. Try again later.', variant: 'destructive' });
      }

      setUser(upgradedUser);
      setShowGuestUpgradeModal(false);
      setGuestUpgradeEmail('');
      setGuestUpgradeOtp('');
      setGuestUpgradeOtpSent(false);
      setGuestUpgradeDevOtp('');
    } catch (err) {
      toast({ title: 'Incorrect OTP', description: err instanceof Error ? err.message : 'Verification failed.', variant: 'destructive' });
    } finally {
      setGuestUpgradeLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    if (passwordInput.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }
    toast({ title: "Authenticating...", description: "Checking credentials." });
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/cannot-find-user') {
        toast({ title: "Registering...", description: "Creating a new account." });
        try {
          await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        } catch (createErr) {
          console.error("Firebase signup error:", createErr);
          toast({
            title: "Signup Failed",
            description: createErr instanceof Error ? createErr.message : "Registration failed.",
            variant: "destructive"
          });
        }
      } else {
        console.error("Firebase login error:", err);
        toast({
          title: "Authentication Failed",
          description: authErr.message || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
    }
  };

  const handleLogout = async () => {
    setAccounts([]);
    setTransactions([]);
    setSelectedAccountId(null);

    const method = user?.authMethod;

    // Firebase Auth users (Google, email/password)
    if (method === 'google' || method === 'email') {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Signout error:', err);
      }
    }

    // All non-Firebase users (phone OTP, email OTP, guest) — clear manually
    setUser(null);
    setShowLogin(true);
    setIsLocked(false);
    setPinInput('');
    setOtpSent(false);
    setOtpInput('');
    setPhoneInput('');
    setEmailOtpSent(false);
    setEmailOtpInput('');
    setEmailInput('');
    localStorage.removeItem('rupee_ledger_user');
    toast({ title: 'Signed Out', description: 'You have been logged out successfully.' });
  };

  // Business Profile and Security Handlers
  const handleProfileChange = (key: keyof BusinessProfile, value: string) => {
    setBusinessProfile(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePinCodeChange = async (code: string) => {
    const cleaned = code.replace(/\D/g, "").slice(0, 4);
    let hashed = "";
    if (cleaned.length === 4) {
      hashed = await hashPin(cleaned, user?.id || "guest_local");
    }
    setSecuritySettings(prev => ({
      ...prev,
      pinCode: cleaned,
      hashedPinCode: cleaned.length === 0 ? "" : (hashed || prev.hashedPinCode)
    }));
  };

  const togglePinSecurity = () => {
    const isCurrentlyEnabled = securitySettings.pinEnabled;
    if (!isCurrentlyEnabled) {
      const hasPin = (securitySettings.pinCode && securitySettings.pinCode.length === 4) ||
                     (securitySettings.hashedPinCode && securitySettings.hashedPinCode.length === 64);
      if (!hasPin) {
        toast({
          title: "Setup PIN First",
          description: "Please enter a 4-digit numeric PIN code before enabling the security lock.",
          variant: "destructive"
        });
        return;
      }
    }
    setSecuritySettings(prev => ({
      ...prev,
      pinEnabled: !prev.pinEnabled
    }));
    toast({
      title: !isCurrentlyEnabled ? "Security PIN Locked" : "Security PIN Unlocked",
      description: !isCurrentlyEnabled 
        ? "App is now configured to lock on startup." 
        : "App startup lock has been disabled."
    });
  };

  // Subscription helpers
  const daysRemaining = useMemo(() => {
    try {
      const parsedDate = parse(subscription.renewalDate, "dd-MM-yyyy", new Date());
      const diffTime = parsedDate.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  }, [subscription.renewalDate]);



  const handleBuyLicenseKey = async (duration: "monthly" | "annual") => {
    try {
      let purchaserEmail = user?.email || "";
      if (!purchaserEmail) {
        const inputEmail = prompt("Please enter your email address for key delivery:");
        if (!inputEmail || !inputEmail.includes("@")) {
          toast({
            title: "Email Required",
            description: "A valid email address is required to deliver your license key.",
            variant: "destructive"
          });
          return;
        }
        purchaserEmail = inputEmail.trim();
      }

      const amount = duration === "annual" ? 1999 : 199;
      const targetUrl = typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? ''
        : 'https://www.rupeeledgerpro.com';

      const verifyUrl = `${targetUrl}/api/razorpay/verify`;

      toast({
        title: "Initiating Payment Gateway...",
        description: `Preparing payment for your ${duration} Pro Key.`
      });

      const orderResponse = await fetch(`${targetUrl}/api/razorpay/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (!orderResponse.ok) {
        throw new Error("Unable to initialize order with server gateway.");
      }

      const order = await orderResponse.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RazorpayConstructor = (window as any).Razorpay;

      // Handle offline or mock orders (missing API keys on server side)
      if (!RazorpayConstructor || order.isMock) {
        toast({
          title: "Gateway Mock Mode",
          description: "Server keys missing. Running simulated checkout...",
        });

        const verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: order.id,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(2, 10),
            razorpay_signature: 'sig_mock_' + Math.random().toString(36).substring(2, 10),
            userId: user?.id || 'guest_local',
            duration,
            email: purchaserEmail,
            purchaserContact: user?.phone || purchaserEmail
          })
        });

        if (!verifyResponse.ok) {
          throw new Error("Simulated verification was rejected.");
        }

        const verifyResult = await verifyResponse.json();
        if (verifyResult.verified && verifyResult.licenseKey) {
          setBoughtKey({ key: verifyResult.licenseKey, duration: duration === "annual" ? "Annual (365 Days)" : "Monthly (30 Days)" });
          if (isOwner && user?.id) {
            fetchGeneratedKeys(user.id);
          }
        } else {
          toast({ title: "Verification Failed", description: "Verification rejected.", variant: "destructive" });
        }
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_T5M6deMH7KrUEn',
        amount: order.amount,
        currency: order.currency,
        name: 'Rupee Ledger Pro',
        description: `${duration === "annual" ? "Annual" : "Monthly"} License Key Purchase`,
        order_id: order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          try {
            toast({
              title: "Verifying Transaction...",
              description: "Validating signature parameters."
            });

            const verifyResponse = await fetch(verifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user?.id || 'guest_local',
                duration,
                email: purchaserEmail,
                purchaserContact: user?.phone || purchaserEmail
              })
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment signature verification failed.");
            }

            const verifyResult = await verifyResponse.json();
            if (verifyResult.verified && verifyResult.licenseKey) {
              setBoughtKey({ key: verifyResult.licenseKey, duration: duration === "annual" ? "Annual (365 Days)" : "Monthly (30 Days)" });
              if (isOwner && user?.id) {
                fetchGeneratedKeys(user.id);
              }
            } else {
              toast({
                title: "Invalid Signature",
                description: "Security check rejected payment authenticity.",
                variant: "destructive"
              });
            }
          } catch (err) {
            console.error('Verify fetch error:', err);
            let errMsg = 'Failed to connect to verification server.';
            if (err instanceof Error) errMsg = err.message;
            toast({
              title: "Verification Failure",
              description: errMsg,
              variant: "destructive"
            });
          }
        },
        prefill: {
          name: businessProfile.companyName || 'RupeeLedger Member',
          contact: businessProfile.phone || '9999999999',
          email: purchaserEmail
        },
        theme: {
          color: '#0f172a'
        }
      };

      const rzp = new RazorpayConstructor(options);
      rzp.open();
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Initiation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const fetchGeneratedKeys = async (userId: string) => {
    if (!isOwner) return;
    try {
      const res = await fetch(`/api/keys?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch generated keys');
      const data = await res.json();
      if (data.isOfflineFallback) {
        return;
      }
      setGeneratedKeysList(data.keys || []);
    } catch (err) {
      console.error("Error fetching generated keys:", err);
    }
  };

  const handleGenerateLicenseKey = async () => {
    if (!isOwner) {
      toast({
        title: "Access Denied",
        description: "Only the system owner is authorized to generate license keys.",
        variant: "destructive"
      });
      return;
    }
    setIsGeneratingKey(true);
    try {
      const keyPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const keyPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const keyPart3 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newKey = `RL-PRO-${keyPart1}-${keyPart2}-${keyPart3}`;
      
      const durationDays = vendorKeyDuration === "annual" ? 365 : 30;
      
      if (user && user.authMethod !== 'guest') {
        const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: newKey,
            durationDays,
            createdBy: user.id
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save key');

        toast({
          title: "License Key Generated",
          description: `Key ${newKey} is saved to cloud keys database.`
        });
        await fetchGeneratedKeys(user.id);
      } else {
        const newLocalKey = {
          key: newKey,
          duration: vendorKeyDuration === "annual" ? "Annual" : "Monthly",
          createdAt: Date.now(),
          status: "unused"
        };
        setGeneratedKeysList(prev => [newLocalKey, ...prev]);
        toast({
          title: "License Key Generated (Local Mode)",
          description: `Key ${newKey} is stored in local reseller memory.`
        });
      }
    } catch (err) {
      console.error("Error generating key:", err);
      toast({
        title: "Key Generation Failed",
        description: "Could not write license key configuration to cloud.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const [licenseInput, setLicenseInput] = useState("");
  const handleActivateKey = async () => {
    const keyStr = licenseInput.trim().toUpperCase();
    if (!keyStr) return;

    if (user && user.authMethod !== 'guest') {
      try {
        const res = await fetch('/api/keys', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: keyStr,
            userId: user.id
          })
        });
        const data = await res.json();
        if (res.ok) {
          const days = data.durationDays || 30;
          const newRenewalStr = format(addDays(new Date(), days), "dd-MM-yyyy");
          const planName = days === 365 ? "Pro Business (Annual License)" : "Pro Business (Monthly License)";
          const priceStr = days === 365 ? "₹1,999 / year" : "₹199 / month";
          
          setSubscription({
            status: "active",
            plan: planName,
            price: priceStr,
            renewalDate: newRenewalStr,
            licenseKey: keyStr,
            purchasedAt: Date.now()
          });
          setLicenseInput("");
          toast({
            title: "License Activated!",
            description: `Your ${days === 365 ? "annual" : "monthly"} Pro license is verified and active.`,
          });
          return;
        } else {
          toast({
            title: "Verification Failed",
            description: data.error || "The entered license key could not be verified.",
            variant: "destructive"
          });
          return;
        }
      } catch (err) {
        console.error("Cloud key verification error, falling back:", err);
      }
    }

    if (keyStr === "RL-PRO-8742-9901-LOCK" || keyStr.startsWith("RL-PRO-")) {
      const isAnnual = keyStr.includes("ANNUAL") || keyStr.length > 15;
      const days = isAnnual ? 365 : 30;
      const newRenewalStr = format(addDays(new Date(), days), "dd-MM-yyyy");
      setSubscription({
        status: "active",
        plan: days === 365 ? "Pro Business (Annual License)" : "Pro Business (Monthly License)",
        price: days === 365 ? "₹1,999 / year" : "₹199 / month",
        renewalDate: newRenewalStr,
        licenseKey: keyStr,
        purchasedAt: Date.now()
      });
      setLicenseInput("");
      toast({
        title: "License Activated (Offline Mode)",
        description: `License key verified under local policy rules.`,
      });
    } else {
      toast({
        title: "Invalid Key",
        description: "The entered license key could not be verified.",
        variant: "destructive"
      });
    }
  };

  // Lock Screen states & keystroke handlers
  const [pinInput, setPinInput] = useState("");
  
  const handleKeyPress = async (num: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      if (newPin.length === 4) {
        const typedHash = await hashPin(newPin, user?.id || "guest_local");
        const matchesHashed = securitySettings.hashedPinCode && typedHash === securitySettings.hashedPinCode;
        const matchesPlaintext = !securitySettings.hashedPinCode && newPin === securitySettings.pinCode;
        
        if (matchesHashed || matchesPlaintext) {
          setIsLocked(false);
          setPinInput("");
          toast({ title: "Unlocked Successfully", description: "Welcome back to RupeeLedger." });
        } else {
          setTimeout(() => {
            setPinInput("");
            toast({ title: "Incorrect PIN", description: "Redirecting to authentication login screen.", variant: "destructive" });
            setShowLogin(true); // Automatically change screen to login page
          }, 300);
        }
      }
    }
  };
  
  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (!isLocked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, pinInput, securitySettings.hashedPinCode, securitySettings.pinCode]);

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
    const storageSuffix = user ? user.id : "guest_local";
    localStorage.setItem(`rupee_ledger_accounts_${storageSuffix}`, JSON.stringify(finalAccounts));
    localStorage.setItem(`rupee_ledger_transactions_${storageSuffix}`, JSON.stringify(updatedTransactions));

    if (user && user.authMethod !== 'guest' && cloudBackupEnabled) {
      pushSyncToMongoDB(user.id, finalAccounts, updatedTransactions, businessProfile, subscription, securitySettings).catch(err => {
        console.error("MongoDB batch sync error:", err);
      });
    }
  };

  const handleAccountSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const type = formData.get("type") as AccountType;
    const rawBalance = parseFloat(formData.get("balance") as string) || 0;
    const balanceType = formData.get("balanceType") as "Credit" | "Debit";
    const initialBalance = balanceType === "Debit" ? -Math.abs(rawBalance) : Math.abs(rawBalance);
    const address = formData.get("address") as string || "";
    const gstin = formData.get("gstin") as string || "";
    const phone = formData.get("phone") as string || "";
    const bankName = formData.get("bankName") as string || "";
    const bankAccountNumber = formData.get("bankAccountNumber") as string || "";
    const bankIfsc = formData.get("bankIfsc") as string || "";
    const bankAccountName = formData.get("bankAccountName") as string || "";

    if (editingAccount) {
      const updatedAccounts = accounts.map(a => 
        a.id === editingAccount.id ? { ...a, name, type, initialBalance, address, gstin, phone, bankName, bankAccountNumber, bankIfsc, bankAccountName } : a
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
        address,
        gstin,
        phone,
        bankName,
        bankAccountNumber,
        bankIfsc,
        bankAccountName,
      };
      recalculateData([...accounts, newAccount], transactions);
      setIsNewAccountOpen(false);
      toast({ title: "Account created" });
    }
  };

  const deleteAccount = async () => {
    if (!accountToDelete) return;

    const updatedAccounts = accounts.filter(a => a.id !== accountToDelete);
    const updatedTransactions = transactions.filter(t => t.accountId !== accountToDelete);
    
    if (user && user.authMethod !== 'guest' && cloudBackupEnabled) {
      pushSyncToMongoDB(user.id, updatedAccounts, updatedTransactions, businessProfile, subscription, securitySettings).catch(err => {
        console.error("MongoDB account deletion sync error:", err);
        // We do not toast here since it's background, or we could toast a warning.
      });
    }

    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    if (selectedAccountId === accountToDelete) setSelectedAccountId(null);
    setAccountToDelete(null);
    toast({ title: "Account deleted" });
  };

  const handleTransactionAdd = (data: { 
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
    shippingAddress?: string;
  }) => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(7),
      accountId: data.accountId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date,
      balanceAfter: 0,
      gstEnabled: data.gstEnabled,
      gstRate: data.gstRate,
      gstType: data.gstType,
      cgst: data.cgst,
      sgst: data.sgst,
      igst: data.igst,
      taxableAmount: data.taxableAmount,
      invoiceNumber: data.invoiceNumber,
      customerName: data.customerName,
      customerGstin: data.customerGstin,
      gstCalculationType: data.gstCalculationType,
      hsnCode: data.hsnCode,
      customerAddress: data.customerAddress,
      shippingAddress: data.shippingAddress,
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

    const updatedTransactions = transactions.map(t => {
      if (t.id === editingTransaction.id) {
        let cgst = t.cgst;
        let sgst = t.sgst;
        let igst = t.igst;
        let taxableAmount = t.taxableAmount;

        if (t.gstEnabled && t.gstRate) {
          taxableAmount = Math.round((amount / (1 + t.gstRate / 100)) * 100) / 100;
          const totalGst = Math.round((amount - taxableAmount) * 100) / 100;
          if (t.gstType === 'CGST+SGST') {
            cgst = Math.round((totalGst / 2) * 100) / 100;
            sgst = Math.round((totalGst / 2) * 100) / 100;
            igst = 0;
          } else {
            cgst = 0;
            sgst = 0;
            igst = totalGst;
          }
        }

        return { 
          ...t, 
          amount, 
          type, 
          description,
          cgst,
          sgst,
          igst,
          taxableAmount
        };
      }
      return t;
    });

    recalculateData(accounts, updatedTransactions);
    setEditingTransaction(null);
    toast({ title: "Transaction updated" });
  };

  const deleteTransaction = async () => {
    if (!transactionToDelete) return;

    const updatedTransactions = transactions.filter(t => t.id !== transactionToDelete);

    recalculateData(accounts, updatedTransactions);
    setTransactionToDelete(null);
    toast({ title: "Transaction deleted" });
  };

  const handleClearAllData = async () => {
    if (user && user.authMethod !== 'guest') {
      try {
        await pushSyncToMongoDB(user.id, [], [], businessProfile, subscription, securitySettings);
      } catch (err) {
        console.error("MongoDB clear all data error:", err);
        toast({ title: "Cloud Clear Failed", description: "Could not clear all records from cloud.", variant: "destructive" });
      }
    }

    setAccounts([]);
    setTransactions([]);
    setSelectedAccountId(null);
    const storageSuffix = user ? user.id : "guest_local";
    localStorage.removeItem(`rupee_ledger_accounts_${storageSuffix}`);
    localStorage.removeItem(`rupee_ledger_transactions_${storageSuffix}`);
    setActiveTab("dashboard");
    setIsClearDataAlertOpen(false);
    toast({ title: "All data cleared successfully" });
  };

  const handleCloudBackupNow = async () => {
    if (!user || user.authMethod === 'guest') {
      toast({ title: "Guest Mode", description: "Please log in to backup to the cloud.", variant: "destructive" });
      return;
    }
    toast({ title: "Backing up...", description: "Uploading database to MongoDB." });
    try {
      await pushSyncToMongoDB(user.id, accounts, transactions, businessProfile, subscription, securitySettings);
      toast({ title: "Backup Successful", description: "All data is securely saved in the cloud." });
    } catch (err) {
      console.error("Manual cloud backup error:", err);
      toast({ title: "Backup Failed", description: "Failed to upload database to the cloud.", variant: "destructive" });
    }
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

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions)) {
          recalculateData(parsed.accounts, parsed.transactions);
          toast({ 
            title: "Backup Restored Successfully", 
            description: `Imported ${parsed.accounts.length} accounts and ${parsed.transactions.length} transactions.` 
          });
        } else {
          throw new Error("Invalid backup file format. Must contain accounts and transactions arrays.");
        }
      } catch (err) {
        console.error("Backup import error:", err);
        toast({ 
          title: "Import Failed", 
          description: err instanceof Error ? err.message : "Invalid JSON file.", 
          variant: "destructive" 
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  
  const analyticsData = useMemo(() => {
    const monthsData: { [key: string]: { month: string; income: number; expenses: number; net: number; sortKey: number } } = {};
    
    // Group transactions by month for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = format(d, "MMM yyyy");
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      monthsData[monthLabel] = {
        month: monthLabel,
        income: 0,
        expenses: 0,
        net: 0,
        sortKey
      };
    }

    const filteredTransactions = analyticsAccountId === "all"
      ? transactions
      : transactions.filter(t => t.accountId === analyticsAccountId);

    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthLabel = format(date, "MMM yyyy");
      if (monthsData[monthLabel]) {
        if (t.type === 'Credit') {
          monthsData[monthLabel].income += t.amount;
        } else {
          monthsData[monthLabel].expenses += t.amount;
        }
      }
    });

    return Object.values(monthsData)
      .map(item => ({
        ...item,
        net: item.income - item.expenses
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [transactions, analyticsAccountId]);

  const handleExportExcel = () => {
    if (!selectedAccount) return;
    
    const headers = ["Date", "Description / Narration", "Type", "Amount (INR)", "Running Balance (INR)"];
    
    const rows = accountTransactions.map(t => [
      format(t.date, "yyyy-MM-dd"),
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      t.amount,
      t.balanceAfter
    ]);
    
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedAccount.name.toLowerCase().replace(/\s+/g, "-")}-ledger-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast({ title: "Excel (CSV) Exported", description: "Ledger spreadsheet downloaded successfully." });
  };

  const accountTransactions = useMemo(() => {
    let filtered = transactions.filter(t => t.accountId === selectedAccountId);

    if (ledgerSearch.trim() !== "") {
      const query = ledgerSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(query) ||
        t.amount.toString().includes(query) ||
        t.type.toLowerCase().includes(query)
      );
    }

    if (ledgerStartDate !== "") {
      const startMs = new Date(ledgerStartDate).setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => t.date >= startMs);
    }

    if (ledgerEndDate !== "") {
      const endMs = new Date(ledgerEndDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => t.date <= endMs);
    }

    return filtered.sort((a, b) => b.date - a.date);
  }, [transactions, selectedAccountId, ledgerSearch, ledgerStartDate, ledgerEndDate]);

  const todayStats = useMemo(() => {
    return transactions
      .filter(t => isSameDay(new Date(t.date), new Date()))
      .reduce((acc, t) => {
        if (t.type === 'Credit') acc.credit += t.amount;
        else acc.debit += t.amount;
        return acc;
      }, { credit: 0, debit: 0 });
  }, [transactions]);

  if (showLogin && isLoaded) {
    return (
      <>
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-y-auto p-4 animate-in fade-in duration-300">
        <Toaster />
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          
          {/* Brand Logo Header */}
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 border border-primary/20">
              <span className="text-3xl font-extrabold text-white">₹</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-2">RupeeLedger</h1>
            <p className="text-xs text-muted-foreground">Select authentication profile to open your account ledger</p>
          </div>

          {/* Login Mode Tab Switches */}
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(["google", "phone", "whatsapp", "email"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setLoginTab(tab);
                  setOtpSent(false);
                  setWhatsappOtpSent(false);
                }}
                className={`py-1.5 text-[10px] font-semibold rounded transition-all capitalize ${
                  loginTab === tab 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-muted-foreground hover:text-slate-200"
                }`}
              >
                {tab === 'whatsapp' ? 'WhatsApp' : tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4 pt-2">
            
            {/* Google Sign-in tab */}
            {loginTab === "google" && (
              <div className="space-y-4 flex flex-col items-center py-4">
                <p className="text-xs text-center text-muted-foreground leading-relaxed px-4">
                  Log in securely using your Google account to enable auto-backups and cloud database syncing.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold hover:bg-slate-100 active:scale-[0.98] transition-all h-11 px-4 rounded-lg shadow-md border"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </button>
              </div>
            )}

            {/* Phone OTP Sign-in tab */}
            {loginTab === "phone" && (
              <div className="space-y-4">
                {!otpSent ? (
                  <div className="space-y-3">
                    <Label htmlFor="phoneLogin" className="text-xs text-slate-300">Enter Contact Phone Number</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center justify-center bg-slate-950 border border-slate-800 text-sm font-semibold rounded-lg px-3 h-11 shrink-0">+91</span>
                      <Input
                        id="phoneLogin"
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        className="bg-slate-950 border-slate-800 text-white h-11"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSendOTP}
                      className="w-full h-11 bg-primary text-white hover:bg-primary/95"
                    >
                      Send SMS OTP Challenge
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label htmlFor="otpCode" className="text-xs text-slate-300">Enter 6-Digit OTP Code</Label>
                    {generatedOtp && (
                      <div className="bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-400 mb-1">Demo OTP</p>
                        <p className="text-2xl font-mono font-bold text-amber-400 tracking-widest">{generatedOtp}</p>
                      </div>
                    )}
                    <Input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      placeholder="xxxxxx"
                      className="bg-slate-950 border-slate-800 text-white text-center font-mono tracking-widest text-lg h-11"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOtpSent(false)}
                        className="flex-1 h-11 bg-transparent border-slate-800 hover:bg-slate-850 hover:text-white"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleVerifyOTP}
                        className="flex-1 h-11 bg-primary text-white hover:bg-primary/95"
                      >
                        Verify & Access
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp OTP Sign-in tab */}
            {loginTab === "whatsapp" && (
              <div className="space-y-4">
                {!whatsappOtpSent ? (
                  <div className="space-y-3">
                    <Label htmlFor="whatsappLogin" className="text-xs text-slate-300">Enter WhatsApp Phone Number</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center justify-center bg-slate-950 border border-slate-800 text-sm font-semibold rounded-lg px-3 h-11 shrink-0">+91</span>
                      <Input
                        id="whatsappLogin"
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        className="bg-slate-950 border-slate-800 text-white h-11"
                        value={whatsappInput}
                        onChange={(e) => setWhatsappInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSendWhatsappOTP}
                      disabled={whatsappOtpLoading}
                      className="w-full h-11 bg-green-600 hover:bg-green-500 text-white font-bold"
                    >
                      {whatsappOtpLoading ? 'Sending...' : 'Send WhatsApp OTP'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label htmlFor="whatsappOtpCode" className="text-xs text-slate-300">Enter 6-Digit WhatsApp OTP</Label>
                    {whatsappGeneratedOtp && (
                      <div className="bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-400 mb-1">Demo OTP</p>
                        <p className="text-2xl font-mono font-bold text-amber-400 tracking-widest">{whatsappGeneratedOtp}</p>
                      </div>
                    )}
                    <Input
                      id="whatsappOtpCode"
                      type="text"
                      maxLength={6}
                      placeholder="xxxxxx"
                      className="bg-slate-950 border-slate-800 text-white text-center font-mono tracking-widest text-lg h-11"
                      value={whatsappOtpInput}
                      onChange={(e) => setWhatsappOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setWhatsappOtpSent(false); setWhatsappOtpInput(''); }}
                        className="flex-1 h-11 bg-transparent border-slate-800 hover:bg-slate-850 hover:text-white"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleVerifyWhatsappOTP}
                        disabled={whatsappOtpLoading}
                        className="flex-1 h-11 bg-green-600 hover:bg-green-500 text-white font-bold"
                      >
                        {whatsappOtpLoading ? 'Verifying...' : 'Verify & Access'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email OTP / Password Sign-in tab */}
            {loginTab === "email" && (
              <div className="space-y-4">
                {/* Mode toggle */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[11px] text-primary underline underline-offset-2"
                    onClick={() => { setEmailLoginMode(emailLoginMode === 'otp' ? 'password' : 'otp'); setEmailOtpSent(false); setEmailOtpInput(''); }}
                  >
                    {emailLoginMode === 'otp' ? 'Use password instead' : 'Use OTP instead (no password)'}
                  </button>
                </div>

                {/* Email OTP Mode */}
                {emailLoginMode === 'otp' && (
                  <div className="space-y-3">
                    {!emailOtpSent ? (
                      <>
                        <div className="space-y-1">
                          <Label htmlFor="emailOtpAddr" className="text-xs text-slate-300">Email Address</Label>
                          <Input
                            id="emailOtpAddr"
                            type="email"
                            placeholder="name@company.com"
                            className="bg-slate-950 border-slate-800 text-white h-11"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendEmailOtp()}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={emailOtpLoading}
                          className="w-full h-11 bg-primary text-white hover:bg-primary/95"
                        >
                          {emailOtpLoading ? 'Sending...' : 'Send OTP to Email'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-slate-400">OTP sent to <span className="text-white font-semibold">{emailInput}</span></p>
                        <div className="space-y-1">
                          <Label htmlFor="emailOtpCode" className="text-xs text-slate-300">Enter 6-Digit OTP</Label>
                          <Input
                            id="emailOtpCode"
                            type="text"
                            maxLength={6}
                            placeholder="xxxxxx"
                            className="bg-slate-950 border-slate-800 text-white text-center font-mono tracking-widest text-lg h-11"
                            value={emailOtpInput}
                            onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyEmailOtp()}
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => { setEmailOtpSent(false); setEmailOtpInput(''); }} className="flex-1 h-11 bg-transparent border-slate-800 hover:text-white">Back</Button>
                          <Button type="button" onClick={handleVerifyEmailOtp} disabled={emailOtpLoading} className="flex-1 h-11 bg-primary text-white hover:bg-primary/95">
                            {emailOtpLoading ? 'Verifying...' : 'Verify & Sign In'}
                          </Button>
                        </div>
                        <button type="button" className="text-[11px] text-muted-foreground w-full text-center" onClick={handleSendEmailOtp}>Resend OTP</button>
                      </>
                    )}
                  </div>
                )}

                {/* Password Mode */}
                {emailLoginMode === 'password' && (
                  <form onSubmit={handleEmailLogin} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="emailInput" className="text-xs text-slate-300">Email Address</Label>
                      <Input id="emailInput" type="email" required placeholder="name@company.com" className="bg-slate-950 border-slate-800 text-white h-11" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="passInput" className="text-xs text-slate-300">Password</Label>
                      <Input id="passInput" type="password" required placeholder="••••••••" className="bg-slate-950 border-slate-800 text-white h-11" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-primary text-white hover:bg-primary/95">Log In / Create Account</Button>
                  </form>
                )}
              </div>
            )}

          </div>


          <p className="text-[10px] text-center text-muted-foreground mt-4 leading-relaxed">
            By authenticating, you agree to our terms. All sessions require a verified login and maintain a secure cloud ledger bridge.
          </p>
        </div>
      </div>

      {/* Guest Account Upgrade Modal */}
      {showGuestUpgradeModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-lg font-bold text-white">Account Upgrade Required</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your 7-day guest plan has expired. Link your email to continue accessing your ledger and save your data permanently to the cloud.
              </p>
            </div>

            {!guestUpgradeOtpSent ? (
              <div className="space-y-3">
                <Label className="text-xs text-slate-300">Your Email Address</Label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  className="bg-slate-950 border-slate-700 text-white h-11"
                  value={guestUpgradeEmail}
                  onChange={(e) => setGuestUpgradeEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendGuestUpgradeOtp()}
                  autoFocus
                />
                <Button
                  onClick={handleSendGuestUpgradeOtp}
                  disabled={guestUpgradeLoading}
                  className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  {guestUpgradeLoading ? 'Sending...' : 'Send OTP & Link Account'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">OTP sent to <span className="text-white font-semibold">{guestUpgradeEmail}</span></p>
                {guestUpgradeDevOtp && (
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Demo OTP</p>
                    <p className="text-2xl font-mono font-bold text-amber-400 tracking-widest">{guestUpgradeDevOtp}</p>
                  </div>
                )}
                <Label className="text-xs text-slate-300">Enter 6-Digit OTP</Label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="xxxxxx"
                  className="bg-slate-950 border-slate-700 text-white text-center font-mono tracking-widest text-lg h-11"
                  value={guestUpgradeOtp}
                  onChange={(e) => setGuestUpgradeOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyGuestUpgrade()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setGuestUpgradeOtpSent(false); setGuestUpgradeOtp(''); }} className="flex-1 h-11 bg-transparent border-slate-700 hover:text-white text-xs">Back</Button>
                  <Button onClick={handleVerifyGuestUpgrade} disabled={guestUpgradeLoading} className="flex-1 h-11 bg-amber-500 hover:bg-amber-400 text-black font-bold">
                    {guestUpgradeLoading ? 'Linking...' : 'Verify & Link'}
                  </Button>
                </div>
                <button type="button" className="text-[11px] text-muted-foreground w-full text-center" onClick={handleSendGuestUpgradeOtp}>Resend OTP</button>
              </div>
            )}
          </div>
        </div>
      )}
      </>
    );
  }

  if (isLocked && isLoaded) {
    return (
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-950 text-slate-100 animate-in fade-in duration-300">
        <Toaster />
        <div className="w-full max-w-md p-8 flex flex-col items-center text-center space-y-8">
          {/* Logo / Brand */}
          <div className="flex flex-col items-center space-y-3 animate-bounce">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 border border-primary/20">
              <span className="text-3xl font-extrabold text-white">₹</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">RupeeLedger</h1>
              <p className="text-xs text-muted-foreground/80 mt-0.5">Commercial Grade Privacy Ledger</p>
            </div>
          </div>

          <div className="space-y-3 w-full">
            <p className="text-sm font-semibold tracking-wide uppercase text-primary">Ledger Secured</p>
            <h2 className="text-lg text-slate-300">Enter PIN to Unlock</h2>
            
            {/* Visual PIN Dots */}
            <div className="flex justify-center gap-4 py-4">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  className={`h-4 w-4 rounded-full border border-primary/50 transition-all duration-150 ${
                    index < pinInput.length ? "bg-primary scale-110 shadow-lg shadow-primary/50" : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* On-screen Numeric keypad */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xl font-bold hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition-all duration-100"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPinInput("")}
              className="h-14 w-14 rounded-full flex items-center justify-center text-xs font-semibold hover:text-primary active:scale-95 transition-all"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xl font-bold hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition-all duration-100"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 w-14 rounded-full flex items-center justify-center text-xs font-semibold hover:text-destructive active:scale-95 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isTrialExpired && isLoaded) {
    return (
      <div className="fixed inset-0 z-[15000] flex flex-col items-center justify-center bg-slate-950 text-slate-100 animate-in fade-in duration-300">
        <Toaster />
        <div className="w-full max-w-md p-8 flex flex-col items-center text-center space-y-6 bg-slate-900 border border-red-500/20 rounded-3xl shadow-2xl">
          {/* Logo / Expiry Icon */}
          <div className="flex flex-col items-center space-y-3">
            <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/30">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Free Trial Expired</h1>
              <p className="text-xs text-slate-400 mt-1">Your 7-day free trial usage period has ended.</p>
            </div>
          </div>

          <div className="w-full space-y-4 pt-4 border-t border-slate-800">
            <div className="bg-slate-950 rounded-xl p-4 text-left border border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select a Subscription Plan</p>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-900">
                <span className="text-slate-300">Monthly Pro License</span>
                <span className="font-bold text-white">₹199 / month</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-300">Annual Pro License</span>
                <span className="font-bold text-amber-400">₹1,999 / year</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleBuyLicenseKey("monthly")}
                className="h-11 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white font-bold"
              >
                Buy Monthly
              </Button>
              <Button 
                onClick={() => handleBuyLicenseKey("annual")}
                className="h-11 bg-amber-500 hover:bg-amber-400 text-black font-bold"
              >
                Buy Annual
              </Button>
            </div>
          </div>

          <div className="w-full space-y-3 pt-4 border-t border-slate-800">
            <Label className="text-xs text-left block text-slate-300">Already have an Activation Key?</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="RL-PRO-XXXX-XXXX-XXXX"
                className="bg-slate-950 border-slate-800 text-white font-mono tracking-wider text-xs h-11"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
              />
              <Button 
                onClick={handleActivateKey}
                className="h-11 px-4 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs"
              >
                Activate
              </Button>
            </div>
          </div>

          <div className="w-full pt-4 border-t border-slate-800 text-slate-400 space-y-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Support & Inquiries</p>
            <p className="text-xs font-semibold text-slate-300">Owner: L.ASHOK KUMAR, COIMBATORE</p>
            <p className="text-xs">Mobile: <a href="tel:+919791335351" className="text-amber-400 font-bold hover:underline">9791335351</a></p>
          </div>

          <div className="w-full pt-2">
            <button 
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-white underline transition-all"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col no-print bg-background text-foreground">
      <Toaster />
      
      {/* Mobile Top Bar */}
      <header className="flex md:hidden items-center justify-between p-4 bg-primary text-primary-foreground shadow-md border-b">
        <div className="flex items-center space-x-3">
          {user ? (
            <img 
              src={user.avatarUrl || "/logo.png"} 
              alt="User Profile" 
              className="h-8 w-8 rounded-full border border-accent/20 bg-primary-foreground/10" 
            />
          ) : (
            <img src="/logo.png" alt="RupeeLedger Logo" className="h-8 w-8 rounded-lg object-cover border border-accent/20" />
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight leading-tight">RupeeLedger</h1>
            {user && (
              <p className="text-[9px] text-primary-foreground/75 font-semibold truncate leading-none mt-0.5">
                {user.name} ({user.authMethod === 'guest' ? 'Guest' : 'Synced'})
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setIsDailyReportOpen(true)}
            title="Daily Reports"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setActiveTab(activeTab === "gst" ? "dashboard" : "gst")}
            title="GST & Invoices"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setActiveTab(activeTab === "analytics" ? "dashboard" : "analytics")}
            title="Analytics"
          >
            <TrendingUp className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setActiveTab(activeTab === "settings" ? "dashboard" : "settings")}
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground p-6 shadow-xl border-r">
          <div className="flex items-center space-x-3 mb-6">
            <img src="/logo.png" alt="RupeeLedger Logo" className="h-10 w-10 rounded-lg object-cover shadow-md border border-accent/20" />
            <h1 className="text-xl font-bold tracking-tight">RupeeLedger</h1>
          </div>

          {/* User Profile Card */}
          {user && (
            <div className="flex items-center space-x-3 p-3 bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl mb-6 shadow-sm">
              <img 
                src={user.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=user"} 
                alt="User Avatar" 
                className="h-10 w-10 rounded-full border border-primary-foreground/20 bg-primary-foreground/10" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping shrink-0" />
                  <p className="text-[10px] text-primary-foreground/70 font-semibold truncate uppercase tracking-wider">
                    {user.authMethod === 'guest' ? 'Local Guest' : 'Cloud Synced'}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              variant={activeTab === "analytics" ? "secondary" : "ghost"} 
              className="w-full justify-start font-medium"
              onClick={() => setActiveTab("analytics")}
            >
              <TrendingUp className="mr-2 h-4 w-4" /> Cash Flow Analytics
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start font-medium"
              onClick={() => setIsDailyReportOpen(true)}
            >
              <CalendarDays className="mr-2 h-4 w-4" /> Daily Reports
            </Button>
            <Button 
              variant={activeTab === "gst" ? "secondary" : "ghost"} 
              className="w-full justify-start font-medium"
              onClick={() => setActiveTab("gst")}
            >
              <FileText className="mr-2 h-4 w-4" /> GST & Invoices
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
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-xs font-semibold text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-white mb-2 h-8"
              >
                Sign Out Session
              </Button>
            )}
            <p className="text-[10px] text-primary-foreground/40 text-center">v1.2.0 - Private Ledger</p>
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
                  <Button onClick={() => { setNewAccountContext('company'); setIsNewAccountOpen(true); }} className="flex-1 sm:flex-none bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Account
                  </Button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass-card premium-glow premium-heading-card shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today&apos;s Inflow</p>
                    <div className="text-2xl font-bold mt-1 text-green-600">
                      <CurrencyDisplay amount={todayStats.credit} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card premium-glow premium-heading-card shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today&apos;s Outflow</p>
                    <div className="text-2xl font-bold mt-1 text-destructive">
                      <CurrencyDisplay amount={todayStats.debit} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card premium-glow premium-heading-card shadow-sm hidden lg:block border-primary/10">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today&apos;s Net Change</p>
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
                    <Button onClick={() => { setNewAccountContext('company'); setIsNewAccountOpen(true); }} variant="outline">Create My First Account</Button>
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
                      onCreateCustomer={() => { setNewAccountContext('buyer'); setIsNewAccountOpen(true); }}
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
                        <p className="text-muted-foreground ml-10 italic mb-2">Detailed Transaction Ledger</p>
                        {selectedAccount && (selectedAccount.gstin || selectedAccount.phone || selectedAccount.address) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 ml-10 text-xs text-muted-foreground">
                            {selectedAccount.gstin && (
                              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded font-mono font-medium flex items-center">
                                GSTIN: {selectedAccount.gstin}
                              </span>
                            )}
                            {selectedAccount.phone && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold opacity-70">Phone:</span> {selectedAccount.phone}
                              </span>
                            )}
                            {selectedAccount.address && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold opacity-70">Address:</span> {selectedAccount.address}
                              </span>
                            )}
                          </div>
                        )}
                     </div>
                     <div className="flex items-center space-x-2">
                      <Button variant="outline" onClick={handleExportExcel}>
                        <Download className="mr-2 h-4 w-4" /> Export Excel
                      </Button>
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

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left Column: Filters, Metrics, Table */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Search and Date filters block */}
                      <div className="bg-card p-4 rounded-xl border border-primary/5 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                        <div className="flex-1 relative">
                          <Input
                            type="text"
                            placeholder="Search transactions by narration, amount, or type..."
                            value={ledgerSearch}
                            onChange={(e) => setLedgerSearch(e.target.value)}
                            className="h-10 pl-3 pr-10"
                          />
                          {ledgerSearch && (
                            <button 
                              onClick={() => setLedgerSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground font-medium">From</span>
                            <Input
                              type="date"
                              value={ledgerStartDate}
                              onChange={(e) => setLedgerStartDate(e.target.value)}
                              className="h-10 text-xs w-[140px]"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground font-medium">To</span>
                            <Input
                              type="date"
                              value={ledgerEndDate}
                              onChange={(e) => setLedgerEndDate(e.target.value)}
                              className="h-10 text-xs w-[140px]"
                            />
                          </div>
                          {(ledgerStartDate || ledgerEndDate || ledgerSearch) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setLedgerSearch("");
                                setLedgerStartDate("");
                                setLedgerEndDate("");
                              }}
                              className="text-xs h-10 hover:bg-slate-100"
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="glass-card premium-glow premium-heading-card bg-muted/10 shadow-sm relative group">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Opening Balance</p>
                                <div className="text-2xl font-bold mt-1">
                                  <CurrencyDisplay amount={selectedAccount?.initialBalance || 0} />
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0 -mt-1 -mr-2"
                                onClick={() => setEditingAccount(selectedAccount || null)}
                                title="Edit Opening Balance"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="glass-card premium-glow premium-heading-card ring-1 ring-primary/20 border-primary shadow-md">
                          <CardContent className="pt-6">
                            <p className="text-xs text-primary uppercase font-bold tracking-wider">Net Balance</p>
                            <div className="text-2xl font-bold mt-1 text-primary">
                              <CurrencyDisplay amount={selectedAccount?.currentBalance || 0} />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="glass-card premium-glow premium-heading-card bg-muted/10 shadow-sm">
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
                                          {t.gstEnabled && (
                                            <DropdownMenuItem onClick={() => setSelectedInvoice({ t, a: selectedAccount! })}>
                                              <FileText className="mr-2 h-4 w-4 text-primary" /> View Invoice
                                            </DropdownMenuItem>
                                          )}
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
                    </div>

                    {/* Right Column: Quick Entry Form */}
                    <div className="space-y-4">
                      <TransactionForm 
                        accounts={accounts}
                        defaultAccountId={selectedAccountId}
                        onSuccess={handleTransactionAdd}
                        onCreateCustomer={() => { setNewAccountContext('buyer'); setIsNewAccountOpen(true); }}
                      />
                    </div>
                  </div>
                 </>
               )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500 pb-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-primary">Cash Flow Analytics</h2>
                  <p className="text-muted-foreground font-medium text-sm">Visual insights into your income, expenses, and cash flow trends</p>
                </div>
                
                <div className="w-full sm:w-[220px]">
                  <Label htmlFor="analyticsFilter" className="text-xs font-semibold text-slate-700 block mb-1">Filter Portfolio</Label>
                  <Select 
                    value={analyticsAccountId} 
                    onValueChange={(val) => setAnalyticsAccountId(val)}
                  >
                    <SelectTrigger id="analyticsFilter" className="bg-card">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Global (All Accounts)</SelectItem>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Key Summary metrics for last 6 months */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80 bg-slate-50/50">
                  <CardHeader className="py-4">
                    <CardDescription className="text-xs uppercase font-bold text-slate-500">6-Month Total Inflow</CardDescription>
                    <CardTitle className="premium-heading text-2xl text-green-600 font-bold">
                      <CurrencyDisplay amount={analyticsData.reduce((sum, item) => sum + item.income, 0)} />
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80 bg-slate-50/50">
                  <CardHeader className="py-4">
                    <CardDescription className="text-xs uppercase font-bold text-slate-500">6-Month Total Outflow</CardDescription>
                    <CardTitle className="premium-heading text-2xl text-destructive font-bold">
                      <CurrencyDisplay amount={analyticsData.reduce((sum, item) => sum + item.expenses, 0)} />
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80 bg-primary/5 border-primary/10">
                  <CardHeader className="py-4">
                    <CardDescription className="text-xs uppercase font-bold text-primary/80">Average Monthly Cash Flow</CardDescription>
                    <CardTitle className="premium-heading text-2xl font-bold">
                      <CurrencyDisplay 
                        amount={
                          analyticsData.length > 0 
                            ? analyticsData.reduce((sum, item) => sum + item.net, 0) / analyticsData.length 
                            : 0
                        } 
                        showSign 
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cash Flow Line Chart */}
                <Card className="glass-card premium-glow premium-heading-card shadow-md border-slate-200/80 p-6 space-y-4 lg:col-span-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Net Cash Flow Trend</h3>
                    <p className="text-xs text-muted-foreground">Monthly net savings (Inflow - Outflow) over the last 6 months</p>
                  </div>
                  <div className="h-[300px] w-full pt-4">
                    {analyticsData.some(d => d.income > 0 || d.expenses > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData}>
                          <defs>
                            <linearGradient id="colorNetFlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#f8fafc" }}
                            formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Net Cash Flow"]}
                          />
                          <Area type="monotone" dataKey="net" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorNetFlow)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50 text-muted-foreground text-sm italic">
                        No financial activity recorded in the last 6 months.
                      </div>
                    )}
                  </div>
                </Card>

                {/* Income vs Expenses Double Bar Chart */}
                <Card className="glass-card premium-glow premium-heading-card shadow-md border-slate-200/80 p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Monthly Inflow vs Outflow</h3>
                    <p className="text-xs text-muted-foreground">Side-by-side comparison of total Credits and total Debits</p>
                  </div>
                  <div className="h-[280px] w-full pt-4">
                    {analyticsData.some(d => d.income > 0 || d.expenses > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData} margin={{ left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#f8fafc" }}
                            formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="income" name="Inflow (Credits)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Outflow (Debits)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50 text-muted-foreground text-sm italic">
                        No transactions recorded yet.
                      </div>
                    )}
                  </div>
                </Card>

                {/* Expense Graph */}
                <Card className="glass-card premium-glow premium-heading-card shadow-md border-slate-200/80 p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Monthly Expenses Trend</h3>
                    <p className="text-xs text-muted-foreground">Detailed view of total Outflows (Debits)</p>
                  </div>
                  <div className="h-[280px] w-full pt-4">
                    {analyticsData.some(d => d.income > 0 || d.expenses > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData}>
                          <defs>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#f8fafc" }}
                            formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Total Outflow"]}
                          />
                          <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50 text-muted-foreground text-sm italic">
                        No expense logs recorded yet.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "gst" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500 pb-12">
              <GSTReportTab 
                transactions={transactions}
                accounts={accounts}
                businessProfile={businessProfile}
                onViewInvoice={(tx, acc) => setSelectedInvoice({ t: tx, a: acc })}
                onCreateInvoice={() => setIsNewInvoiceOpen(true)}
              />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500 pb-12">
               <div>
                  <h2 className="text-3xl font-bold text-primary">System Settings</h2>
                  <p className="text-muted-foreground font-medium text-sm">Manage business profile, subscription, security, and backups</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* User Profile / Session Card */}
                  {user && (
                    <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80 md:col-span-2">
                      <CardHeader>
                        <CardTitle className="premium-heading premium-heading">User Profile & Session</CardTitle>
                        <CardDescription>Manage your active authenticated cloud identity</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <img 
                              src={user.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=user"} 
                              alt="User Avatar" 
                              className="h-16 w-16 rounded-full border bg-slate-100 p-1" 
                            />
                            <div>
                              <p className="font-bold text-lg text-slate-800">{user.name}</p>
                              {user.email && <p className="text-sm text-slate-500 font-mono">{user.email}</p>}
                              {user.phone && <p className="text-sm text-slate-500 font-mono">+91 {user.phone}</p>}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`h-2 w-2 rounded-full ${user.authMethod === 'guest' ? 'bg-amber-500' : 'bg-green-500'}`} />
                                <span className="text-xs font-semibold text-slate-600 capitalize">
                                  Auth Profile: {user.authMethod} Mode
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="destructive" 
                            onClick={handleLogout} 
                            className="shrink-0 font-medium w-full sm:w-auto"
                          >
                            Sign Out Session
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Business Profile Card */}
                  <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80">
                    <CardHeader>
                      <CardTitle className="premium-heading premium-heading">Business Profile Settings</CardTitle>
                      <CardDescription>Configure custom headers for invoices, reports, and statements</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="compName" className="text-xs font-semibold text-slate-700">Company / Business Name</Label>
                          <Input 
                            id="compName" 
                            value={businessProfile.companyName} 
                            placeholder="e.g. RupeeLedger Enterprises" 
                            onChange={(e) => handleProfileChange('companyName', e.target.value)} 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="compAddress" className="text-xs font-semibold text-slate-700">Business Address</Label>
                          <Input 
                            id="compAddress" 
                            value={businessProfile.address} 
                            placeholder="e.g. 123 Financial Tower, New Delhi, India" 
                            onChange={(e) => handleProfileChange('address', e.target.value)} 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="compGSTIN" className="text-xs font-semibold text-slate-700">GSTIN (Optional)</Label>
                            <Input 
                              id="compGSTIN" 
                              value={businessProfile.gstin} 
                              placeholder="e.g. 07AAAAA1111A1Z1" 
                              onChange={(e) => handleProfileChange('gstin', e.target.value)} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="compPhone" className="text-xs font-semibold text-slate-700">Contact Phone</Label>
                            <Input 
                              id="compPhone" 
                              value={businessProfile.phone} 
                              placeholder="e.g. +91 98765 43210" 
                              onChange={(e) => handleProfileChange('phone', e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="printFooter" className="text-xs font-semibold text-slate-700">Print Statement Footer Message</Label>
                          <Input 
                            id="printFooter" 
                            value={businessProfile.printFooter} 
                            placeholder="e.g. Terms & Conditions apply. Computer generated voucher." 
                            onChange={(e) => handleProfileChange('printFooter', e.target.value)} 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Lock Card */}
                  <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80">
                    <CardHeader>
                      <CardTitle className="premium-heading premium-heading">Security Lock</CardTitle>
                      <CardDescription>Secure your local ledger with a 4-digit PIN code</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
                        <div className="space-y-0.5 max-w-[70%]">
                          <p className="font-semibold text-sm">Require PIN Code Lock</p>
                          <p className="text-xs text-muted-foreground">Prompt for 4-digit PIN when loading the app.</p>
                        </div>
                        <button
                          type="button"
                          onClick={togglePinSecurity}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            securitySettings.pinEnabled ? "bg-primary" : "bg-input"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                              securitySettings.pinEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-dashed border-slate-300">
                        <Label htmlFor="pinCode" className="text-xs font-semibold text-slate-700">Set 4-Digit Numeric PIN</Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input 
                            id="pinCode" 
                            type="password"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            maxLength={4}
                            value={securitySettings.pinCode} 
                            placeholder={securitySettings.hashedPinCode ? "••••" : "xxxx"} 
                            className="font-mono tracking-widest text-center text-lg w-28 h-10 shrink-0"
                            onChange={(e) => handlePinCodeChange(e.target.value)} 
                          />
                          <p className="text-xs text-muted-foreground flex items-center leading-relaxed">
                            Only numbers are permitted. Note: You must specify a valid 4-digit PIN before the startup lock can be toggled active.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Subscription & Billing Card */}
                  <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80 md:col-span-2">
                    <CardHeader>
                      <CardTitle className="premium-heading premium-heading">Subscription & Billing</CardTitle>
                      <CardDescription>Manage your business subscription and license tier</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                          <p className="text-[10px] uppercase font-bold text-primary/80">License Tier</p>
                          <p className="text-lg font-bold mt-1 text-slate-800">{subscription.plan}</p>
                          <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-800 rounded-full">
                            {subscription.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Rate / Billing Plan</p>
                          <p className="text-lg font-bold mt-1 text-slate-800">{subscription.price}</p>
                          <p className="text-xs text-muted-foreground mt-1">Charged via monthly auto-invoice</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border">
                          <p className="text-[10px] uppercase font-bold text-slate-500 font-semibold text-primary">Renewal Period</p>
                          <p className="text-lg font-bold mt-1 text-slate-800">{subscription.renewalDate}</p>
                          <p className="text-xs text-muted-foreground mt-1 font-semibold text-primary">
                            {daysRemaining} Days Left in Cycle
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-slate-50 border rounded-lg">
                        <div className="space-y-1 flex-1">
                          <p className="font-semibold text-sm">Purchase Pro Activation Key</p>
                          <p className="text-xs text-muted-foreground">Buy a monthly (30 Days - ₹199) or annual (365 Days - ₹1,999) activation key via Razorpay.</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button 
                              onClick={() => handleBuyLicenseKey("monthly")} 
                              variant="outline" 
                              size="sm"
                              className="font-medium text-xs bg-white hover:bg-slate-100"
                            >
                              Buy Monthly Key (₹199)
                            </Button>
                            <Button 
                              onClick={() => handleBuyLicenseKey("annual")} 
                              variant="outline" 
                              size="sm"
                              className="font-medium text-xs bg-white border-accent/60 text-accent hover:bg-accent/5"
                            >
                              Buy Annual Key (₹1,999)
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t">
                        <Label htmlFor="licenseKeyInput" className="text-xs font-semibold text-slate-700">Activate Annual License Key</Label>
                        <div className="flex gap-2 max-w-md">
                          <Input 
                            id="licenseKeyInput" 
                            value={licenseInput} 
                            placeholder="RL-PRO-xxxx-xxxx-xxxx" 
                            className="font-mono uppercase text-sm"
                            onChange={(e) => setLicenseInput(e.target.value)} 
                          />
                          <Button onClick={handleActivateKey} variant="outline" className="shrink-0">
                            Verify & Activate
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Current active system key: <span className="font-mono font-bold text-slate-600">{subscription.licenseKey || "None"}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reseller & License Selling Panel */}
                  {isOwner && (
                    <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80 md:col-span-2">
                      <CardHeader>
                        <CardTitle className="premium-heading text-primary flex items-center gap-2">
                          <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Reseller & License Selling Options
                        </CardTitle>
                        <CardDescription>Generate unique activation license keys to sell/distribute to client profiles</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-slate-50 border rounded-lg">
                          <div className="space-y-1.5 flex-1">
                            <Label htmlFor="keyDurationSelect" className="text-xs font-semibold text-slate-700">License Key Type / Duration</Label>
                            <Select 
                              value={vendorKeyDuration} 
                              onValueChange={(val) => setVendorKeyDuration(val as "monthly" | "annual")}
                            >
                              <SelectTrigger id="keyDurationSelect" className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly License Key (30 Days - ₹199 value)</SelectItem>
                                <SelectItem value="annual">Annual Pro License Key (365 Days - ₹1,999 value)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={handleGenerateLicenseKey} 
                            disabled={isGeneratingKey}
                            className="shrink-0 font-medium w-full sm:w-auto"
                          >
                            {isGeneratingKey ? "Generating Key..." : "Generate License Key"}
                          </Button>
                        </div>

                        <div className="space-y-3 pt-2">
                          <Label className="text-xs font-semibold text-slate-700">Reseller Key Inventory & Logs</Label>
                          {generatedKeysList.length === 0 ? (
                            <div className="text-center p-6 border border-dashed rounded-lg bg-slate-50/50">
                              <p className="text-xs text-muted-foreground">No license keys generated yet. Click generate above to create your first client activation key.</p>
                            </div>
                          ) : (
                            <div className="border rounded-lg overflow-hidden bg-white max-h-[220px] overflow-y-auto">
                              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                  <tr>
                                    <th className="px-4 py-2">License Key</th>
                                    <th className="px-4 py-2">Duration</th>
                                    <th className="px-4 py-2">Created</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {generatedKeysList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80">
                                      <td className="px-4 py-2.5 font-mono text-[11px] select-all font-bold text-slate-700">{item.key}</td>
                                      <td className="px-4 py-2.5">{item.duration}</td>
                                      <td className="px-4 py-2.5 text-slate-500">{format(item.createdAt, "dd-MM-yyyy HH:mm")}</td>
                                      <td className="px-4 py-2.5">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          item.status === 'used' 
                                            ? 'bg-slate-100 text-slate-600' 
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                          {item.status.toUpperCase()}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="h-7 text-[10px]" 
                                          onClick={() => {
                                            navigator.clipboard.writeText(item.key);
                                            toast({ title: "Key Copied", description: `${item.key} copied to clipboard.` });
                                          }}
                                        >
                                          Copy Key
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Data & Backups Card */}
                  <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80">
                    <CardHeader>
                      <CardTitle className="premium-heading premium-heading">Data & Backups</CardTitle>
                      <CardDescription>Keep your financial data safe</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Automatic Cloud Backup Toggle */}
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                        <div className="space-y-0.5 max-w-[70%]">
                          <p className="font-semibold text-sm">Automatic Cloud Backup</p>
                          <p className="text-xs text-muted-foreground">
                            {user && user.authMethod !== 'guest' 
                              ? "Automatically sync ledger changes to Firebase secure cloud storage." 
                              : "Not available in Guest Mode. Log in to enable secure cloud backups."}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!user || user.authMethod === 'guest'}
                          onClick={() => setCloudBackupEnabled(!cloudBackupEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            user && user.authMethod !== 'guest' && cloudBackupEnabled ? "bg-primary" : "bg-input"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                              user && user.authMethod !== 'guest' && cloudBackupEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {user && user.authMethod !== 'guest' && (
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                          <div className="space-y-0.5 max-w-[70%]">
                            <p className="font-semibold text-sm">Force Cloud Sync</p>
                            <p className="text-xs text-muted-foreground">Manually upload all local accounts and records to Firestore.</p>
                          </div>
                          <Button onClick={handleCloudBackupNow} size="sm" variant="default" className="shrink-0">
                            Backup Now
                          </Button>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg border gap-4">
                        <div>
                          <p className="font-semibold text-sm">Local Backup</p>
                          <p className="text-xs text-muted-foreground">Export/Import accounts and transaction history as JSON.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button onClick={handleExportData} size="sm" variant="outline">
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                          </Button>
                          <label className="cursor-pointer shrink-0">
                            <input 
                              type="file" 
                              accept=".json" 
                              onChange={handleImportData} 
                              className="hidden" 
                            />
                            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3">
                              Import
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/10">
                        <div>
                          <p className="font-semibold text-sm text-destructive">Factory Reset</p>
                          <p className="text-xs text-muted-foreground">Wipe all local data. This action is irreversible.</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => setIsClearDataAlertOpen(true)}>
                          <Trash className="mr-2 h-4 w-4" /> Reset
                        </Button>
                      </div>

                      {/* MongoDB Config Check */}
                      {isOwner && (
                        <div className="pt-4 mt-2 border-t space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Database Engine</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-muted/40 rounded-lg border">
                            <div>
                              <p className="text-slate-500 font-semibold">Active Engine</p>
                              <p className="font-sans text-slate-800 font-bold truncate">
                                MongoDB API
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-semibold">Sync Status</p>
                              <p className="font-semibold mt-0.5">
                                {user && user.authMethod !== 'guest' ? (
                                  <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-bold">Cloud Synced</span>
                                ) : (
                                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold font-mono">Guest Local</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
 
                  {/* About Card */}
                  <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80">
                    <CardHeader>
                      <CardTitle className="premium-heading premium-heading">About RupeeLedger</CardTitle>
                      <CardDescription>Application details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="space-y-3">
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Build Version</span>
                            <span className="font-bold">1.2.0 Commercial</span>
                          </div>
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Storage Engine</span>
                            <span className="font-mono text-xs">browser.localStorage + MongoDB</span>
                          </div>
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Privacy Status</span>
                            <span className="text-green-600 font-bold">Encapsulated</span>
                          </div>
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Owner / Support</span>
                            <span className="font-bold text-slate-800 text-right">L.ASHOK KUMAR, COIMBATORE</span>
                          </div>
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground font-medium">Support Mobile</span>
                            <a href="tel:+919791335351" className="text-amber-600 font-bold hover:underline">9791335351</a>
                          </div>
                       </div>
                       <p className="text-xs text-muted-foreground mt-4 italic leading-relaxed">
                         RupeeLedger is designed for absolute privacy. All computations and storage happen entirely within your local browser sandbox. For license renewals or activations, please contact support.
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
          <form onSubmit={handleAccountSubmit} key={editingAccount ? editingAccount.id : "new"}>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Modify Account" : (newAccountContext === 'buyer' ? "Buyer Name" : "Company Name")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{newAccountContext === 'buyer' ? "Buyer Name" : "Company Name"}</Label>
                <Input id="name" name="name" defaultValue={editingAccount?.name} placeholder={newAccountContext === 'buyer' ? "e.g. Senthil Kumar" : "e.g. Acme Corp"} required />
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="balance">Initial Balance (INR)</Label>
                  <Input 
                    id="balance" 
                    name="balance" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingAccount ? Math.abs(editingAccount.initialBalance) : ""} 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balanceType">Balance Type</Label>
                  <Select name="balanceType" defaultValue={editingAccount && editingAccount.initialBalance < 0 ? "Debit" : "Credit"}>
                    <SelectTrigger id="balanceType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit">Credit (Asset / Cash In)</SelectItem>
                      <SelectItem value="Debit">Debit (Liability / Loan / Cash Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN (Optional)</Label>
                <Input 
                  id="gstin" 
                  name="gstin" 
                  defaultValue={editingAccount?.gstin} 
                  placeholder="e.g. 07AAAAA1111A1Z1" 
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input 
                  id="address" 
                  name="address" 
                  defaultValue={editingAccount?.address} 
                  placeholder="Street name, City, State" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  defaultValue={editingAccount?.phone} 
                  placeholder="e.g. +91 99999 99999" 
                />
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-muted-foreground font-semibold">Bank Details</Label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <Input id="bankName" name="bankName" defaultValue={editingAccount?.bankName} placeholder="Bank Name" />
                  <Input id="bankAccountName" name="bankAccountName" defaultValue={editingAccount?.bankAccountName} placeholder="Account Holder Name" />
                  <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={editingAccount?.bankAccountNumber} placeholder="Account Number" />
                  <Input id="bankIfsc" name="bankIfsc" defaultValue={editingAccount?.bankIfsc} placeholder="IFSC Code" />
                </div>
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
          <form onSubmit={handleTransactionEditSubmit} key={editingTransaction ? editingTransaction.id : "new"}>
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
        <DialogContent className="glass-card max-w-3xl">
          <DialogHeader className="no-print">
            <DialogTitle>Voucher Document</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pt-2">
            {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} businessProfile={businessProfile} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="glass-card max-w-3xl">
          <DialogHeader className="no-print">
            <DialogTitle>Tax Invoice Document</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto pt-2">
            {selectedInvoice && <InvoicePrint 
              transaction={selectedInvoice.t} 
              account={selectedInvoice.a} 
              businessProfile={businessProfile} 
              onEdit={(updates) => {
                const updatedTx = { ...selectedInvoice.t, ...updates };
                const updatedTransactions = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
                setTransactions(updatedTransactions);
                setSelectedInvoice({ t: updatedTx, a: selectedInvoice.a });
                recalculateData(accounts, updatedTransactions);
              }}
            />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
        <DialogContent className="glass-card max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle>Create GST Tax Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {isNewInvoiceOpen && (
              <TransactionForm 
                accounts={accounts}
                defaultAccountId={selectedAccountId}
                defaultGstEnabled={true}
                onSuccess={(data) => { 
                  handleTransactionAdd(data); 
                  setIsNewInvoiceOpen(false); 
                }}
                onCreateCustomer={() => { setNewAccountContext('buyer'); setIsNewAccountOpen(true); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={(open) => setIsReportOpen(open)}>
        <DialogContent className="glass-card max-w-4xl">
          <DialogHeader className="no-print">
            <DialogTitle>Account Audit Statement</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            {selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} businessProfile={businessProfile} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDailyReportOpen} onOpenChange={setIsDailyReportOpen}>
        <DialogContent className="glass-card max-w-4xl">
          <DialogHeader className="no-print">
            <DialogTitle>Chronological Daily Ledger</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            <DailyReport 
              transactions={transactions} 
              accounts={accounts} 
              dateInput={dailyReportDateInput}
              setDateInput={setDailyReportDateInput}
              date={dailyReportDate}
              reportMode={dailyReportMode}
              setReportMode={setDailyReportMode}
              selectedMonth={dailyReportMonth}
              setSelectedMonth={setDailyReportMonth}
              selectedYear={dailyReportYear}
              setSelectedYear={setDailyReportYear}
              businessProfile={businessProfile}
            />
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
              This protocol will permanently eliminate every account, entry, and preference from this device&apos;s memory. 
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

      {/* Bought Key Dialog */}
      <Dialog open={!!boughtKey} onOpenChange={(open) => !open && setBoughtKey(null)}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Payment Successful!
            </DialogTitle>
            <DialogDescription>
              Your new {boughtKey?.duration} Pro Activation Key has been created and registered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 border rounded-lg flex items-center justify-between font-mono text-base font-bold text-center select-all tracking-wider text-slate-800">
              {boughtKey?.key}
              <Button 
                onClick={() => {
                  if (boughtKey?.key) {
                    navigator.clipboard.writeText(boughtKey.key);
                    toast({ title: "Key Copied!", description: "License key copied to clipboard." });
                  }
                }}
                size="sm"
                variant="ghost"
                className="ml-2 hover:bg-slate-200/50"
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Instructions:</strong> Copy the code above, paste it in the <strong>&quot;Activate Annual License Key&quot;</strong> field in settings, and click <strong>&quot;Verify &amp; Activate&quot;</strong> to apply it to your account.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setBoughtKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print-only containers */}
      <div className="print-only fixed inset-0 z-[9999] bg-white overflow-visible">
         {selectedVoucher && <VoucherPrint transaction={selectedVoucher.t} account={selectedVoucher.a} businessProfile={businessProfile} />}
         {selectedInvoice && <InvoicePrint transaction={selectedInvoice.t} account={selectedInvoice.a} businessProfile={businessProfile} />}
         {isReportOpen && selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} businessProfile={businessProfile} />}
         {isDailyReportOpen && (
           <DailyReport 
             transactions={transactions} 
             accounts={accounts} 
             dateInput={dailyReportDateInput}
             setDateInput={setDailyReportDateInput}
             date={dailyReportDate}
             reportMode={dailyReportMode}
             setReportMode={setDailyReportMode}
             selectedMonth={dailyReportMonth}
             setSelectedMonth={setDailyReportMonth}
             selectedYear={dailyReportYear}
             setSelectedYear={setDailyReportYear}
             businessProfile={businessProfile}
           />
         )}
      </div>
    </div>
  );
}
