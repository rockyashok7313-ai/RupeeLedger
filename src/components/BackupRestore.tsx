import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow, isValid } from "date-fns";
import {
  CircleCheck, CloudAlert, CloudOff, Loader2, RotateCcw, ShieldAlert, HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { computeTotals } from "@/lib/balance";
import type { Account, Transaction } from "@/lib/types";

/** One row from /api/ledger/backup?action=list. */
interface BackupSummary {
  id: number;
  taken_on: string;
  created_at: string;
  account_count: number;
  transaction_count: number;
  byte_size: number;
}

/** The full snapshot, fetched only when one is opened. */
interface BackupDetail extends Pick<BackupSummary, "id" | "taken_on"> {
  payload: {
    accounts?: Account[];
    transactions?: Transaction[];
    [k: string]: unknown;
  };
  account_count: number;
  transaction_count: number;
}

interface BackupRestoreProps {
  /** Owner id with the branch folded in, as the sync route expects. */
  scopedUserId: string;
  getToken: () => Promise<string | null>;
  /** What the device currently holds, for the before/after comparison. */
  accounts: Account[];
  transactions: Transaction[];
  /** Applies a restored snapshot. Only called after an explicit confirmation. */
  onRestore: (payload: BackupDetail["payload"]) => void;
  /** When the last successful cloud snapshot happened, ISO. */
  lastCloudBackupAt: string | null;
  /** Why the last cloud snapshot failed, if it did. */
  lastCloudBackupError: string | null;
  /** How many days of local copies this device is holding. */
  localSlotCount: number;
  enabled: boolean;
}

const prettyBytes = (n: number) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const safeDate = (value: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isValid(d) ? d : null;
};

export function BackupRestore({
  scopedUserId, getToken, accounts, transactions, onRestore,
  lastCloudBackupAt, lastCloudBackupError, localSlotCount, enabled,
}: BackupRestoreProps) {
  const [history, setHistory] = useState<BackupSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupDetail | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const token = await getToken();
      const res = await fetch("/api/ledger/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: scopedUserId, ...body }),
      });
      if (!res.ok) {
        // 413 and friends answer with HTML, so never assume JSON here.
        const detail = await res.text().catch(() => "");
        let parsed = "";
        try { parsed = JSON.parse(detail)?.error || ""; } catch { /* not JSON */ }
        if (res.status === 401 || res.status === 403) {
          throw new Error("Your session has expired. Sign in again to reach your backups.");
        }
        throw new Error(parsed || `Request failed (${res.status}).`);
      }
      return res.json();
    },
    [getToken, scopedUserId],
  );

  const loadHistory = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setListError(null);
    try {
      const body = await call({ action: "list" });
      if (body?.isOfflineFallback) {
        setListError("Cloud backups are not configured on the server.");
        setHistory([]);
        return;
      }
      setHistory(body.backups ?? []);
    } catch (e: any) {
      setListError(e?.message || "Could not load your backup history.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [call, enabled]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const openPreview = async (id: number) => {
    setOpening(id);
    try {
      const body = await call({ action: "restore", backupId: id });
      setPreview(body.backup as BackupDetail);
    } catch (e: any) {
      setListError(e?.message || "Could not open that backup.");
    } finally {
      setOpening(null);
    }
  };

  const confirmRestore = () => {
    if (!preview) return;
    setRestoring(true);
    try {
      onRestore(preview.payload);
      setPreview(null);
    } finally {
      setRestoring(false);
    }
  };

  const lastOk = safeDate(lastCloudBackupAt);
  const now = computeTotals(accounts, transactions);

  // Figures for the snapshot being previewed, so the comparison is like for like.
  const snapAccounts = (preview?.payload.accounts ?? []) as Account[];
  const snapTransactions = (preview?.payload.transactions ?? []) as Transaction[];
  const snap = preview ? computeTotals(snapAccounts, snapTransactions) : null;
  const entryDelta = snap ? snap.transactionCount - now.transactionCount : 0;

  return (
    <div className="space-y-4">
      {/* ---- Sync state ---------------------------------------------------- */}
      <div
        className={cn(
          "rounded-lg border p-4",
          !enabled && "bg-muted/30",
          enabled && lastCloudBackupError && "border-destructive/30 bg-destructive/5",
          enabled && !lastCloudBackupError && lastOk && "border-credit/30 bg-credit-subtle/40",
          enabled && !lastCloudBackupError && !lastOk && "bg-muted/30",
        )}
      >
        <div className="flex items-start gap-3">
          {!enabled ? <CloudOff className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden /> :
           lastCloudBackupError ? <CloudAlert className="mt-0.5 h-5 w-5 text-destructive" aria-hidden /> :
           lastOk ? <CircleCheck className="mt-0.5 h-5 w-5 text-credit" aria-hidden /> :
           <CloudOff className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {!enabled ? "Daily cloud snapshots are off"
                : lastCloudBackupError ? "Last cloud snapshot failed"
                : lastOk ? "Daily cloud snapshot is working"
                : "No cloud snapshot yet"}
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {!enabled
                ? "Turn it on above to keep dated copies off this device."
                : lastCloudBackupError
                  ? lastCloudBackupError
                  : lastOk
                    ? `Last uploaded ${formatDistanceToNow(lastOk, { addSuffix: true })}, on ${format(lastOk, "d MMM yyyy 'at' h:mm a")}.`
                    : "Nothing has been uploaded from this device yet. One is taken automatically each day."}
            </p>

            <p className="mt-2 flex items-center gap-1.5 text-2xs text-muted-foreground">
              <HardDrive className="h-3 w-3 shrink-0" aria-hidden />
              {localSlotCount > 0
                ? `${localSlotCount} day${localSlotCount === 1 ? "" : "s"} also held in this browser.`
                : "No copy held in this browser yet."}
              {" "}Browser storage is cleared when you clear site data, so it is not a backup on its own.
            </p>
          </div>

          {enabled && (
            <Button variant="outline" size="sm" onClick={() => void loadHistory()} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Refresh"}
            </Button>
          )}
        </div>
      </div>

      {/* ---- What protects what -------------------------------------------- */}
      {/* Plain statements of what each layer does NOT cover, so none of them is mistaken for a full backup. */}
      <details className="rounded-lg border">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          How your data is protected
        </summary>
        <dl className="space-y-3 border-t px-4 py-3 text-xs">
          <div>
            <dt className="font-semibold">This device</dt>
            <dd className="text-muted-foreground">
              The working copy. It is lost if you clear site data or change browser. Not a backup.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Cloud sync</dt>
            <dd className="text-muted-foreground">
              Keeps your devices in step. It copies mistakes too: a wrong entry or a deletion appears everywhere. Not a backup.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Daily cloud snapshots (the list below)</dt>
            <dd className="text-muted-foreground">
              One per day for 14 days, so you can undo a bad edit. They are stored in the same cloud database as your
              live data, so they do not protect against losing that database.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Encrypted off-site backup</dt>
            <dd className="text-muted-foreground">
              A nightly copy kept outside this app&apos;s servers, readable only with a private key. It is set up by whoever
              runs the server and its status is not shown here, so ask them to confirm it is running.
            </dd>
          </div>
        </dl>
      </details>

      {/* ---- Recovery history ---------------------------------------------- */}
      {enabled && (
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Recovery history</p>
              <p className="text-xs text-muted-foreground">
                One snapshot per day, kept for 14 days. Restoring always shows a preview first.
              </p>
            </div>
          </div>

          {listError && (
            <p className="flex items-start gap-2 px-4 py-3 text-xs text-destructive">
              <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {listError}
            </p>
          )}

          {loading && history === null && (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your backups…
            </p>
          )}

          {history !== null && history.length === 0 && !listError && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No cloud snapshots yet. The first is taken automatically the next time you open the app with entries in it.
            </p>
          )}

          {history !== null && history.length > 0 && (
            <ul className="divide-y">
              {history.map(b => {
                const taken = safeDate(b.taken_on);
                return (
                  <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {taken ? format(taken, "EEEE, d MMMM yyyy") : b.taken_on}
                      </p>
                      <p className="tabular text-xs text-muted-foreground">
                        {b.transaction_count.toLocaleString("en-IN")} entries ·{" "}
                        {b.account_count.toLocaleString("en-IN")} accounts · {prettyBytes(b.byte_size)}
                      </p>
                    </div>
                    <Button
                      variant="outline" size="sm" className="shrink-0"
                      onClick={() => void openPreview(b.id)}
                      disabled={opening !== null}
                    >
                      {opening === b.id
                        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        : <><RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Preview</>}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ---- Preview and confirm ------------------------------------------- */}
      <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Restore {preview && safeDate(preview.taken_on)
                ? format(safeDate(preview.taken_on)!, "d MMMM yyyy")
                : "this backup"}?
            </DialogTitle>
            <DialogDescription>
              This replaces what is on this device with the snapshot below. Check the figures before confirming.
            </DialogDescription>
          </DialogHeader>

          {snap && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
                <div className="bg-card p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">On this device now</p>
                  <p className="tabular mt-1 text-sm">{now.transactionCount.toLocaleString("en-IN")} entries</p>
                  <p className="tabular text-sm"><CurrencyDisplay amount={now.closing} /></p>
                </div>
                <div className="bg-card p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">In this backup</p>
                  <p className="tabular mt-1 text-sm">{snap.transactionCount.toLocaleString("en-IN")} entries</p>
                  <p className="tabular text-sm"><CurrencyDisplay amount={snap.closing} /></p>
                </div>
              </div>

              {entryDelta < 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  This backup holds {Math.abs(entryDelta).toLocaleString("en-IN")} fewer entries than the device does.
                  Anything added since will be gone. Export a copy first if you are unsure.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPreview(null)} disabled={restoring}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRestore} disabled={restoring}>
              {restoring ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
              Restore this backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
