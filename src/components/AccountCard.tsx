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

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md border-2 relative group",
        isActive ? "border-accent bg-accent/5" : "border-transparent"
      )}
      onClick={onClick}
    >
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(account)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(account.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate pr-8">{account.name}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
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
