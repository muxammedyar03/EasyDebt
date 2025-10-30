"use client";

import * as React from "react";
import { BarChart3, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReportsCard() {
  const router = useRouter();

  return (
    <Card
      className="@container/card cursor-pointer transition-all hover:shadow-lg"
      onClick={() => router.push("/dashboard/reports")}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <span>Hisobotlar</span>
          </div>
          <ArrowRight className="text-muted-foreground h-5 w-5" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Risk tahlili, trend tahlili va to&apos;lov usullari statistikasi
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/dashboard/reports")}>
          Batafsil ko&apos;rish
        </Button>
      </CardContent>
    </Card>
  );
}
