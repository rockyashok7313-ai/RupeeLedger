import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaletteItem {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  keywords?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PaletteItem[];
}

function score(item: PaletteItem, q: string) {
  if (!q) return 1;
  const hay = `${item.label} ${item.keywords || ""} ${item.group}`.toLowerCase();
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  // every query word appears somewhere
  return q.split(/\s+/).every((w) => hay.includes(w)) ? 1 : 0;
}

/** Ctrl/⌘ K: jump to any screen or ledger, or run a common action, from the keyboard. */
export function CommandPalette({ open, onOpenChange, items }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((it) => ({ it, s: score(it, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((r) => r.it);
  }, [items, query]);

  // Keep groups contiguous while preserving rank order within each group.
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, PaletteItem[]>();
    for (const r of results) {
      if (!map.has(r.group)) {
        map.set(r.group, []);
        order.push(r.group);
      }
      map.get(r.group)!.push(r);
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }));
  }, [results]);
  const flat = grouped.flatMap((g) => g.items);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runAt = (i: number) => {
    const item = flat[i];
    if (!item) return;
    onOpenChange(false);
    // let the dialog close (and release focus / pointer locks) before acting
    setTimeout(item.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(active);
    }
  };

  let index = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-sand-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl bg-popover text-popover-foreground elev-5 overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Search and jump</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Type to find a screen, a ledger or an action. Use the arrow keys and Enter.
          </DialogPrimitive.Description>
          <div className="flex items-center gap-3 px-4 border-b">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a ledger, screen or action"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded
              aria-controls="palette-list"
              aria-activedescendant={flat[active] ? `palette-${flat[active].id}` : undefined}
            />
            <kbd className="hidden sm:inline-flex text-2xs text-muted-foreground border rounded-md px-1.5 py-0.5">Esc</kbd>
          </div>
          <div ref={listRef} id="palette-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {flat.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                Nothing matches “{query}”. Try a ledger name or a screen like “GST”.
              </p>
            ) : (
              grouped.map((g) => (
                <div key={g.group} role="group" aria-label={g.group} className="mb-1">
                  <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">{g.group}</p>
                  {g.items.map((item) => {
                    index += 1;
                    const i = index;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        id={`palette-${item.id}`}
                        role="option"
                        aria-selected={i === active}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => runAt(i)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer",
                          i === active ? "bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-100" : "text-foreground",
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.hint && <span className="text-xs text-muted-foreground tabular truncate max-w-[40%]">{item.hint}</span>}
                        {i === active && <CornerDownLeft className="h-3.5 w-3.5 opacity-50 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
