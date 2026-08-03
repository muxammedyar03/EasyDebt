"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getPaymentTypeClass } from "@/lib/utils";

export type CompanyTimelineEvent = {
  id: string;
  type: "DEBT" | "PAYMENT";
  amount: number;
  note: string | null;
  createdAt: Date;
  subtitle?: string;
};

type Props = {
  timeline: CompanyTimelineEvent[];
};

export function CompanyTimeline({ timeline }: Props) {
  if (timeline.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
        Hozircha hech qanday tarix yo&apos;q
      </div>
    );
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-4 text-sm font-semibold">Vaqt chizig&apos;i</h2>
      <ol className="relative ml-3 space-y-0 border-l pl-4">
        {timeline.map((e) => (
          <li key={e.id} className="relative pb-4 last:pb-0">
            <span className="bg-primary absolute top-2 -left-[21px] size-2.5 rounded-full border" />
            <div
              className={`flex flex-col gap-1 rounded-md border-b px-2 py-2 sm:flex-row sm:items-center sm:justify-between ${
                e.type === "DEBT" ? "bg-red-500/5" : "bg-emerald-500/5"
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium">{e.type === "DEBT" ? "Qarz qo'shildi" : "To'lov qilindi"}</p>
                <p className="text-muted-foreground truncate text-xs">{e.note || "—"}</p>
                <p className="text-muted-foreground text-xs">{formatDateUz(e.createdAt, true)}</p>
              </div>
              <div className="flex items-center gap-2">
                {e.subtitle && (
                  <Badge className={getPaymentTypeClass(e.subtitle as "CASH" | "CLICK" | "CARD")}>{e.subtitle}</Badge>
                )}
                <span
                  className={`text-sm font-bold tabular-nums ${e.type === "DEBT" ? "text-red-600" : "text-emerald-600"}`}
                >
                  {e.type === "DEBT" ? "+" : "-"}
                  {formatCurrencyUzs(e.amount)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
