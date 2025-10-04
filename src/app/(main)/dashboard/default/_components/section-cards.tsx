import { Users, TrendingUp, TrendingDown, Calendar, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardsProps {
  stats: {
    totalDebtors: number;
    totalDebt: number;
    totalDebtsCount: number;
    totalDebtsAmount: number;
    totalPaymentsCount: number;
    totalPaymentsAmount: number;
    todayDebtsCount: number;
    todayDebtsAmount: number;
  };
}

export function SectionCards({ stats }: SectionCardsProps) {

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Jami qarzdorlar</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalDebtors}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Users className="size-4" />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Umumiy qarzdorlar soni
          </div>
          <div className="text-muted-foreground">Tizimda ro'yxatdan o'tgan</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Umumiy qarz</CardDescription>
          <CardTitle className="flex items-end gap-1">
            <p className="text-2xl leading-none font-semibold tabular-nums @[250px]/card:text-3xl">{stats.totalDebt.toLocaleString()}</p>
            <span className="text-md leading-5">so'm</span>
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-red-600">
              <TrendingUp className="size-4" />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">{stats.totalDebtsCount} ta qarz yozuvi</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Umumiy to'lovlar</CardDescription>
          <CardTitle className="flex items-end gap-1">
            <p className="text-2xl leading-none font-semibold tabular-nums @[250px]/card:text-3xl">{stats.totalPaymentsAmount.toLocaleString()}</p>
            <span className="text-md leading-5">so'm</span>
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-green-600">
              <TrendingDown className="size-4" />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-green-600">
            To'langan qarzlar
          </div>
          <div className="text-muted-foreground">{stats.totalPaymentsCount} ta to'lov</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Bugungi qarzlar</CardDescription>
          <CardTitle className="flex items-end gap-1">
            <p className="text-2xl leading-none font-semibold tabular-nums @[250px]/card:text-3xl">{stats.todayDebtsAmount.toLocaleString()}</p>
            <span className="text-md leading-5">so'm</span>
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-blue-600">
              <Calendar className="size-4" />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">{stats.todayDebtsCount} ta yangi qarz</div>
        </CardFooter>
      </Card>
    </div>
  );
}
