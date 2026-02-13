"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className={cn("size-9 md:size-10 lg:size-11", className)}
    >
      <ArrowLeft className="size-5" />
      <span className="sr-only">Orqaga</span>
    </Button>
  );
}
