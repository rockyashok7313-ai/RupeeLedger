import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  showSign?: boolean;
}

export function CurrencyDisplay({ amount, className, showSign = false }: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);

  const isNegative = amount < 0;

  return (
    <span className={cn(
      "font-mono font-semibold tabular-nums",
      isNegative ? "text-destructive" : "",
      className
    )}>
      {showSign && amount > 0 ? '+' : ''}
      {formatted}
    </span>
  );
}