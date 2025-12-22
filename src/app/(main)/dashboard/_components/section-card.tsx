"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type SectionCardProps = {
  title: string;
  amount?: number;
  count?: number;
  titleFooter?: string;
  description?: string;
  icon?: React.ReactNode;
  isHide?: boolean;
  defaultVisible?: boolean;
  color?: string;
};

export function SectionCard({
  title,
  amount,
  count,
  titleFooter,
  description,
  icon,
  isHide,
  defaultVisible,
  color,
}: SectionCardProps) {
  const [visible, setVisible] = useState(defaultVisible);

  const toggleVisibility = () => {
    setVisible((prev) => !prev);
  };

  const maskAmount = visible ? amount?.toLocaleString() : "*******";

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-end gap-1">
          <p className="text-2xl leading-none font-semibold tabular-nums @[250px]/card:text-3xl">
            {count ? count : isHide ? maskAmount : amount?.toLocaleString()}
          </p>
          {!count && <span className="text-md leading-5">so&apos;m</span>}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            {isHide ? <CardNumberToggler visible={visible || false} toggleVisibility={toggleVisibility} /> : null}
            <Badge variant="outline" className={`p-2 ${color || "text-red-600"}`}>
              {icon}
            </Badge>
          </div>
        </CardAction>
      </CardHeader>
      {titleFooter || description ? (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">{titleFooter}</div>
          <div className="text-muted-foreground">{description}</div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function CardNumberToggler({ visible, toggleVisibility }: { visible: boolean; toggleVisibility: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={toggleVisibility} className="h-8 w-8">
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}
