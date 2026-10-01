import { Boxes, FileText, History, LayoutDashboard, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "dashboard" | "ledger" | "analytics" | "gst" | "erp" | "settings";

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
  onSearch: () => void;
}

const ITEMS: { tab: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: "dashboard", label: "Today", icon: LayoutDashboard },
  { tab: "ledger", label: "Ledgers", icon: History },
  { tab: "gst", label: "GST", icon: FileText },
  { tab: "erp", label: "Stock", icon: Boxes },
];

/** Thumb-reachable navigation for phones, where most entries are made. */
export function MobileTabBar({ active, onChange, onSearch }: Props) {
  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/90 backdrop-blur-xl no-print"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {ITEMS.map(({ tab, label, icon: Icon }) => {
          const on = active === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-fast",
                on ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center h-7 w-12 rounded-full transition-colors duration-fast",
                  on && "bg-brand-100 dark:bg-brand-950",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onSearch}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <span className="grid place-items-center h-7 w-12 rounded-full">
            <Search className="h-[18px] w-[18px]" />
          </span>
          Search
        </button>
      </div>
    </nav>
  );
}
