"use client";

import * as React from "react";
import { useDebtor } from "./context/debtor-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
            <li key={e.id} className="mb-6">
              <span className="bg-primary absolute -left-2 mt-1 h-3 w-3 rounded-full" />
              <div className="flex items-center justify-between">
                <p className="font-medium">{e.title}</p>
                <Badge
                  variant={e.type === "DEBT" ? "destructive" : "default"}
                  className={e.type === "PAYMENT" ? "bg-green-600" : ""}
                >
                  {e.type === "DEBT" ? "+" : "-"}
                  {e.amount.toLocaleString()} so&apos;m
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{e.subtitle || "—"}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {e.created_at.toLocaleString("uz-UZ", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
