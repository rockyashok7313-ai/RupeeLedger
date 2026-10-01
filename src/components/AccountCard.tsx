import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { Account } from "@/lib/types";
import { Landmark, Wallet, PiggyBank, Briefcase, CreditCard, Pencil, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";

const icons = {
  Cash: Wallet,
  Bank: Landmark,
  Savings: PiggyBank,
  Business: Briefcase,
  Other: CreditCard,
};

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
  onEdit?: (acc: Account) => void;
  onDelete?: (id: string) => void;
  isActive?: boolean;
}

export function AccountCard({ account, onClick, onEdit, onDelete, isActive }: AccountCardProps) {
  const Icon = icons[account.type] || CreditCard;
  const isOverdrawn = account.currentBalance < 0;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={onClick}
      onKeyDown={(e) => {
        // A card that acts as a button has to answer the keyboard like one.
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative isolate cursor-pointer overflow-hidden rounded-xl border",
        "transition-[transform,box-shadow,border-color] duration-base ease-out-quint",
        "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995]",
        isActive
          ? "border-accent/60 shadow-md"
          : "border-border shadow-xs hover:border-accent/40 hover:shadow-md"
      )}
    >
      {/* Selected state reads as a gold spine, echoing a ledger's edge, rather
          than a tinted background that fights the balance figure. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] origin-top transition-transform duration-base ease-out-quint",
          "bg-gradient-to-b from-accent to-primary",
          isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
        )}
      />

      <div
        className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity duration-fast group-hover:opacity-100 focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" aria-label={`Actions for ${account.name}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(account)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(account.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2 pl-5">
        <CardTitle className="line-clamp-2 pr-8 text-sm font-semibold leading-snug text-foreground" title={account.name}>
          {account.name}
        </CardTitle>
        <span className="shrink-0 rounded-md bg-muted p-1.5 text-muted-foreground transition-colors duration-base group-hover:bg-secondary group-hover:text-secondary-foreground">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </CardHeader>

      <CardContent className="p-4 pl-5 pt-0">
        {/* The balance is the one thing worth reading at a glance. */}
        <div className={cn("text-xl", isOverdrawn && "amount-debit")}>
          <CurrencyDisplay amount={account.currentBalance} />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
          <Badge variant="outline" className="h-5 border-border/70 px-1.5 text-2xs font-medium">
            {account.type}
          </Badge>
          {account.gstin && (
            <span className="tabular rounded bg-secondary px-1.5 py-0.5 text-2xs font-medium text-secondary-foreground">
              GST {account.gstin}
            </span>
          )}
        </div>

        {(account.phone || account.address) && (
          <dl className="mt-3 space-y-1 border-t border-border/60 pt-2 text-2xs text-muted-foreground">
            {account.phone && (
              <div className="flex gap-1.5 truncate">
                <dt className="font-medium opacity-70">Phone</dt>
                <dd className="tabular truncate">{account.phone}</dd>
              </div>
            )}
            {account.address && (
              <div className="flex gap-1.5 truncate" title={account.address}>
                <dt className="font-medium opacity-70">Address</dt>
                <dd className="truncate">{account.address}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
