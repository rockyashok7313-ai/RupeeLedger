import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { addDays, format, startOfDay } from "date-fns";
import type { Transaction } from "@/lib/types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

interface Props {
  transactions: Transaction[];
  days?: number;
}

/** Money in and out per day for the last few weeks, as paired bars. */
export function CashflowStrip({ transactions, days = 30 }: Props) {
  const { data, totalIn, totalOut, busiest } = useMemo(() => {
    const start = startOfDay(addDays(new Date(), -(days - 1))).getTime();
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = addDays(new Date(start), i);
      return { key: format(d, "yyyy-MM-dd"), label: format(d, "d MMM"), in: 0, out: 0 };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const t of transactions) {
      if (t.date < start) continue;
      const i = index.get(format(new Date(t.date), "yyyy-MM-dd"));
      if (i === undefined) continue;
      if (t.type === "Credit") buckets[i].in += t.amount;
      else buckets[i].out += t.amount;
    }
    const totalIn = buckets.reduce((s, b) => s + b.in, 0);
    const totalOut = buckets.reduce((s, b) => s + b.out, 0);
    const busiest = buckets.reduce((m, b) => (b.in + b.out > m.in + m.out ? b : m), buckets[0]);
    return { data: buckets, totalIn, totalOut, busiest };
  }, [transactions, days]);

  const empty = totalIn === 0 && totalOut === 0;

  return (
    <section className="rounded-2xl bg-card elev-2 p-5 flex flex-col min-h-[220px]" aria-labelledby="cashflow-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 id="cashflow-title" className="text-base font-semibold">
          Last {days} days
        </h3>
        <dl className="flex gap-5 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-credit" aria-hidden />
            <dt className="text-muted-foreground">In</dt>
            <dd className="tabular font-semibold">{inr.format(totalIn)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-debit" aria-hidden />
            <dt className="text-muted-foreground">Out</dt>
            <dd className="tabular font-semibold">{inr.format(totalOut)}</dd>
          </div>
        </dl>
      </div>

      {empty ? (
        <p className="flex-1 grid place-items-center text-sm text-muted-foreground text-center py-8">
          Entries you post will show up here day by day.
        </p>
      ) : (
        <>
          <div className="flex-1 mt-4 -mx-2">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={data} barGap={1} barCategoryGap="22%">
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={Math.ceil(days / 6)}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  formatter={(v: number, name: string) => [inr.format(v), name === "in" ? "In" : "Out"]}
                />
                <Bar dataKey="in" fill="hsl(var(--credit))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="out" fill="hsl(var(--debit))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Busiest day: {busiest.label}, {inr.format(busiest.in + busiest.out)} moved
          </p>
        </>
      )}
    </section>
  );
}
