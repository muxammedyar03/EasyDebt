"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPaymentTypeClass } from "@/lib/utils";
import { formatDateUz } from "@/lib/format";
import type { TimelineEvent } from "../model";

export interface ViewDebtorTimelineProps {
  timeline: TimelineEvent[];
}

function paymentTypeLabel(type: string | null | undefined, cash: string, click: string, card: string) {
  if (type === "CASH") return cash;
  if (type === "CLICK") return click;
  if (type === "CARD") return card;
  return type ?? "";
}

export function ViewDebtorTimeline({ timeline }: ViewDebtorTimelineProps) {
  const t = useTranslations("debtor");
  const tCommon = useTranslations("common");
  const tPayment = useTranslations("payment");

  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">{t("timelineEmpty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <CardHeader className="px-3 pt-4 md:px-4 md:pt-4">
        <CardTitle className="p-0">{t("timeline")}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 md:px-3 lg:px-4">
        <ol className="relative ml-4 border-l pl-2 md:pl-4 lg:pl-6">
          {timeline.map((e) => {
            const amount = e.amount.toLocaleString();
            const title = e.type === "DEBT" ? t("debtAdded", { amount }) : t("paymentMade", { amount });
            const paymentLabel =
              e.type === "PAYMENT"
                ? paymentTypeLabel(e.subtitle, tPayment("cash"), tPayment("click"), tPayment("card"))
                : null;

            return (
              <li key={e.id} className="">
                <span className="bg-chart-1 border-primary absolute -left-[6px] mt-8 h-3 w-3 rounded-full border md:mt-4" />
                <div
                  className={`${e.type == "DEBT" ? "from-red-500/10 to-red-500/5 dark:bg-gradient-to-tr" : "from-green-600/10 to-green-600/5 dark:bg-gradient-to-tr"} flex h-18 grid-cols-2 items-center justify-between border-b p-1 px-2 lg:grid lg:h-12 lg:grid-cols-12`}
                >
                  <div className="col-span-5">
                    <p className="font-medium">{title}</p>
                    <p className="text-muted-foreground mt-1 flex text-sm lg:hidden">
                      {formatDateUz(e.createdAt, true)}
                    </p>
                  </div>
                  <p className="text-muted-foreground col-span-3 mt-1 hidden text-sm lg:flex">
                    {formatDateUz(e.createdAt, true)}
                  </p>
                  <div className="text-muted-foreground col-span-1 hidden text-sm lg:flex">
                    {paymentLabel ? (
                      <Badge
                        variant="default"
                        className={`h-6 px-3 text-xs ${getPaymentTypeClass(e.subtitle as "CASH" | "CLICK" | "CARD")}`}
                      >
                        {paymentLabel}
                      </Badge>
                    ) : (
                      ""
                    )}
                  </div>
                  <div className="col-span-3 flex flex-col items-end">
                    <p
                      className={`hidden h-8 items-center px-3 text-sm font-bold lg:flex ${e.type === "PAYMENT" ? "text-green-700" : "text-red-600"}`}
                    >
                      {e.type === "DEBT" ? "+" : "-"}
                      {amount} {tCommon("som")}
                    </p>
                    <div className="text-muted-foreground flex text-sm lg:hidden">
                      {paymentLabel ? (
                        <Badge
                          variant="default"
                          className={`h-6 px-3 text-xs ${getPaymentTypeClass(e.subtitle as "CASH" | "CLICK" | "CARD")}`}
                        >
                          {paymentLabel}
                        </Badge>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
