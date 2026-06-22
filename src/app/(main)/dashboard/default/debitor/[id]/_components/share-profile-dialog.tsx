"use client";

import * as React from "react";
import { Share2, Copy, Check, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateShareTokenAction } from "@/server/server-actions";

interface ShareProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  externalId: string;
  debtorName: string;
}

export function ShareProfileDialog({ open, onOpenChange, externalId, debtorName }: ShareProfileDialogProps) {
  const [copied, setCopied] = React.useState(false);
  const [token, setToken] = React.useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIsGeneratingQr(true);
      generateShareTokenAction(externalId)
        .then((t) => {
          setToken(t);
        })
        .catch((err) => {
          console.error("Token generation error:", err);
          toast.error("Havola generatsiya qilishda xatolik yuz berdi");
          setIsGeneratingQr(false);
        });
    } else {
      setToken("");
      setQrCodeUrl("");
    }
  }, [open, externalId]);

  const shareUrl = React.useMemo(() => {
    if (typeof window === "undefined" || !token) return "";
    return `${window.location.origin}/share/debitor/${externalId}?token=${token}`;
  }, [externalId, token]);

  React.useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f172a", // Slate 900
          light: "#ffffff",
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
          setIsGeneratingQr(false);
        })
        .catch((err) => {
          console.error("Failed to generate QR Code:", err);
          setIsGeneratingQr(false);
          toast.error("QR Code yaratishda xatolik yuz berdi");
        });
    }
  }, [shareUrl]);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Havola nusxalandi!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast.error("Havolani nusxalashda xatolik yuz berdi");
    }
  }, [shareUrl]);

  const handleNativeShare = React.useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `${debtorName} - Qarz Hisoboti`,
        text: `${debtorName} ning joriy qarz va to'lovlar hisoboti.`,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share failed
      if ((err as Error).name !== "AbortError") {
        console.error("Native share failed:", err);
        toast.error("Ulashishda xatolik yuz berdi");
      }
    }
  }, [shareUrl, debtorName]);

  const isShareSupported = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] !max-w-[28rem] rounded-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Share2 className="text-primary h-5 w-5" />
            Ссылка на профиль
          </DialogTitle>
          <DialogDescription>{debtorName} профиля для отслеживания</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-6 py-4">
          {/* QR Code Container */}
          <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-inner dark:border-slate-800">
            {isGeneratingQr ? (
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            ) : qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCodeUrl} alt={`${debtorName} QR Code`} className="h-full w-full object-contain" />
            ) : (
              <QrCode className="h-16 w-16 text-slate-300 dark:text-slate-700" />
            )}
          </div>

          {/* Share Link Row */}
          <div className="flex w-full items-center gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="h-12 border-slate-200 bg-slate-50 font-mono text-xs dark:border-slate-800 dark:bg-slate-900/60"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="h-12 w-12 shrink-0 border-slate-200 dark:border-slate-800"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Native Share Button */}
          {isShareSupported && (
            <Button onClick={handleNativeShare} className="h-12 w-full gap-2 font-semibold">
              <Share2 className="h-4 w-4" />
              Tizim orqali ulashish
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
