import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  showSign?: boolean;
  /** Render credit green / debit red. Off by default so balances stay neutral. */
  tone?: "neutral" | "signed";
  /** Drop the paise on dense listings where they add noise rather than precision. */
  compact?: boolean;
}

export function CurrencyDisplay({
  amount,
  className,
  showSign = false,
  tone = "neutral",
  compact = false,
}: CurrencyDisplayProps) {
  const safe = Number.isFinite(amount) ? amount : 0;

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(safe);

  const isNegative = safe < 0;

  return (
    <span
      className={cn(
        // Tabular figures so columns of money line up down the page -- the
        // whole point of a ledger. Never let this fall back to proportional.
        "tabular font-semibold",
        tone === "signed" && !isNegative && safe > 0 && "amount-credit",
        (isNegative || (tone === "signed" && safe < 0)) && "amount-debit",
        className
      )}
      // Screen readers announce the grouped digits as one number.
      aria-label={`${isNegative ? "minus " : ""}${Math.abs(safe)} rupees`}
    >
      {showSign && safe > 0 ? "+" : ""}
      {formatted}
    </span>
  );
}
