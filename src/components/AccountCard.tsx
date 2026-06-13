import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { Account } from "@/lib/types";
import { Landmark, Wallet, PiggyBank, Briefcase, CreditCard } from "lucide-react";

const icons = {
  Cash: Wallet,
  Bank: Landmark,
  Savings: PiggyBank,
  Business: Briefcase,
  Other: CreditCard,
};

export function AccountCard({ account, onClick, isActive }: { account: Account; onClick?: () => void; isActive?: boolean }) {
  const Icon = icons[account.type] || CreditCard;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
        isActive ? "border-accent bg-accent/5" : "border-transparent"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CurrencyDisplay amount={account.currentBalance} />
        </div>
        <Badge variant="outline" className="mt-2 font-normal">
          {account.type}
        </Badge>
      </CardContent>
    </Card>
  );
}

import { cn } from "@/lib/utils";