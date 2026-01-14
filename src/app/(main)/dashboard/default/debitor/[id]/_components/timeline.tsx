"use client";

import * as React from "react";
import { useDebtor } from "./context/debtor-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPaymentTypeClass } from "@/lib/utils";

export function DebtorTimeline() {
  const { timeline } = useDebtor();

  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">Hozircha hech qanday tarix yo&apos;q</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vaqt chizig&apos;i</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative ml-4 border-l pl-6">
          {timeline.map((e) => (
            <li key={e.id} className="">
              <span className="bg-chart-1 border-primary absolute -left-[6px] mt-8 h-3 w-3 rounded-full border md:mt-4" />
              <div
                className={`${e.type == "DEBT" ? "from-red-500/10 to-red-500/5 dark:bg-gradient-to-tr" : "from-green-600/10 to-green-600/5 dark:bg-gradient-to-tr"} flex h-18 grid-cols-2 items-center justify-between border-b p-1 px-2 md:grid md:h-12 md:grid-cols-12`}
              >
                <div className="col-span-5">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-muted-foreground mt-1 flex text-xs md:hidden">
                    {e.createdAt.toLocaleString("uz-UZ", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-muted-foreground col-span-3 mt-1 hidden text-xs md:flex">
                  {e.createdAt.toLocaleString("uz-UZ", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="text-muted-foreground col-span-1 hidden text-sm md:flex">
                  {e.subtitle ? (
                    <Badge
                      variant="default"
                      className={`h-6 px-3 text-xs ${getPaymentTypeClass(e.subtitle as "Karta" | "Click" | "Naqd")}`}
                    >
                      {e.subtitle}
                    </Badge>
                  ) : (
                    ""
                  )}
                </div>
                <div className="col-span-3 flex flex-col items-end">
                  <p
                    className={`flex h-8 items-center px-3 text-sm font-bold ${e.type === "PAYMENT" ? "text-green-700" : "text-red-600"}`}
                  >
                    {e.type === "DEBT" ? "+" : "-"}
                    {e.amount.toLocaleString()} so&apos;m
                  </p>
                  <div className="text-muted-foreground flex text-sm md:hidden">
                    {e.subtitle ? (
                      <Badge
                        variant="default"
                        className={`h-6 px-3 text-xs ${getPaymentTypeClass(e.subtitle as "Karta" | "Click" | "Naqd")}`}
                      >
                        {e.subtitle}
                      </Badge>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
