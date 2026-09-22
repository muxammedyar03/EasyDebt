"use client";

import { backupTableLabels } from "@/lib/tenant-backup/labels";
import * as React from "react";
import { Download, Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface ExportImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "export" | "import";
}

export function ExportImportDialog({ open, onOpenChange, mode }: ExportImportDialogProps) {
  const t = useTranslations("dataExport");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const [password, setPassword] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [fullPreview, setFullPreview] = React.useState<{
    backupId: string;
    counts: Record<string, number>;
    receipts: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewData, setPreviewData] = React.useState<{
    debtorsCount: number;
    debtsCount: number;
    paymentsCount: number;
    exportedBy?: string;
    exportedAt?: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const importJsonTextRef = React.useRef<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setProgress(10);

    try {
      const response = await fetch("/api/debtors/export-json");
      setProgress(50);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("exportFailed"));
      }

      const data = await response.json();
      setProgress(80);

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `debtors-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 5000);

      setProgress(100);
      toast.success(t("exportSuccess"), {
        description: t("exportSuccessDesc", {
          debtors: data.meta.debtorsCount,
          debts: data.meta.debtsCount,
          payments: data.meta.paymentsCount,
        }),
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("exportError"), {
        description: error instanceof Error ? error.message : t("unknownError"),
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(null);
    setPreviewData(null);
    setFullPreview(null);
    setConfirmed(false);
    importJsonTextRef.current = null;

    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.error(t("jsonOnly"));
      return;
    }

    setSelectedFile(file);
    setPreviewData(null);
    setFullPreview(null);
    setConfirmed(false);
    importJsonTextRef.current = null;
    setLoading(true);
    try {
      if (file.size > 150 * 1024 * 1024) throw new Error(t("fileTooLarge"));
      const text = await file.text();
      importJsonTextRef.current = text;
      const data = JSON.parse(text) as {
        meta?: {
          version?: number;
          debtorsCount?: number;
          debtsCount?: number;
          paymentsCount?: number;
          exportedBy?: string;
          exportedAt?: string;
        };
        debtors?: unknown[];
      };

      if (data.meta?.version === 2) {
        const response = await fetch("/api/debtors/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-import-action": "preview" },
          body: text,
        });
        const preview = await response.json();
        if (!response.ok) throw new Error(preview.error || t("invalidFormat"));
        setFullPreview(preview);
        setPreviewData({
          debtorsCount: preview.counts.debtors,
          debtsCount: preview.counts.debts,
          paymentsCount: preview.counts.payments,
          exportedAt: preview.exportedAt,
        });
        return;
      }
      if (!data.meta || !data.debtors) {
        throw new Error(t("invalidFormat"));
      }

      setPreviewData({
        debtorsCount: data.meta.debtorsCount ?? data.debtors.length,
        debtsCount: data.meta.debtsCount ?? 0,
        paymentsCount: data.meta.paymentsCount ?? 0,
        exportedBy: data.meta.exportedBy,
        exportedAt: data.meta.exportedAt,
      });
    } catch (error) {
      importJsonTextRef.current = null;
      toast.error(t("readError"), {
        description: error instanceof Error ? error.message : t("unknownError"),
      });
      setSelectedFile(null);
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error(t("selectFile"));
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      const text = importJsonTextRef.current;
      if (!text) {
        throw new Error(t("fileTextMissing"));
      }
      setProgress(25);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (fullPreview) {
        if (!confirmed || !password)
          throw new Error(
            locale === "ru" ? "Подтвердите импорт и введите пароль" : "Importni tasdiqlang va parol kiriting",
          );
        headers["x-import-confirmation"] = fullPreview.backupId;
        headers["x-import-password"] = encodeURIComponent(password);
      }
      let body: BodyInit = text;

      if (typeof CompressionStream !== "undefined") {
        const blob = new Blob([text]);
        const compressed = await new Response(blob.stream().pipeThrough(new CompressionStream("gzip"))).blob();
        if (compressed.size < text.length) {
          headers["Content-Encoding"] = "gzip";
          body = compressed;
        }
      }

      const response = await fetch("/api/debtors/import", {
        method: "POST",
        headers,
        body,
      });

      setProgress(70);

      const raw = await response.text();
      let result: {
        error?: string;
        debtorsCount?: number;
        debtsCount?: number;
        paymentsCount?: number;
      };
      try {
        result = JSON.parse(raw) as typeof result;
      } catch {
        if (response.status === 413) {
          throw new Error(t("fileTooLarge"));
        }
        throw new Error(response.status >= 500 ? t("serverError", { status: response.status }) : t("nonJsonResponse"));
      }

      if (!response.ok) {
        throw new Error(result.error || t("importFailed"));
      }

      setProgress(100);
      toast.success(t("importSuccess"), {
        description: fullPreview
          ? locale === "ru"
            ? "Полный JSON обработан. Существующие записи сохранены."
            : "Toliq JSON import qilindi. Mavjud yozuvlar saqlandi."
          : t("importSuccessDesc", {
              debtors: result.debtorsCount ?? 0,
              debts: result.debtsCount ?? 0,
              payments: result.paymentsCount ?? 0,
            }),
      });

      onOpenChange(false);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Import error:", error instanceof Error ? error.message : t("unknownError"));
      toast.error(t("importError"), {
        description: error instanceof Error ? error.message : t("unknownError"),
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const resetDialog = () => {
    setPassword("");
    setConfirmed(false);
    setFullPreview(null);
    setSelectedFile(null);
    setPreviewData(null);
    importJsonTextRef.current = null;
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    if (!open) {
      resetDialog();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[560px]" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "export" ? (
              <>
                <Download className="h-5 w-5" />
                {t("exportTitle")}
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                {t("importTitle")}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "export"
              ? locale === "ru"
                ? "Полный JSON магазина: пользователи, настройки, уведомления, история, компании и чеки. Данные зашифрованы."
                : "Toliq magazin JSON: xodimlar, sozlamalar, bildirishnomalar, tarix, kompaniyalar va cheklar. Malumotlar shifrlanadi."
              : locale === "ru"
                ? "Выберите полный JSON магазина или старый файл должников."
                : "Magazinning toliq JSON yoki eski qarzdorlar faylini tanlang."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "export" ? (
            <Alert>
              <FileJson className="h-4 w-4" />
              <AlertTitle>{t("exportFormatTitle")}</AlertTitle>
              <AlertDescription>
                {locale === "ru"
                  ? "Все 15 таблиц и файлы чеков. Файл импортируется здесь же, в этот магазин. Старые JSON также поддерживаются."
                  : "Barcha 15 jadval va chek fayllari. Fayl shu yerda, shu magazinga import qilinadi. Eski JSON ham qabul qilinadi."}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  disabled={loading}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    {selectedFile ? selectedFile.name : t("selectJsonFile")}
                  </Button>
                </label>
              </div>

              {previewData && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>{t("fileInfo")}</AlertTitle>
                  <AlertDescription className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t("debtors")}</span>
                      <span className="font-semibold">{previewData.debtorsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t("debts")}</span>
                      <span className="font-semibold">{previewData.debtsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t("payments")}</span>
                      <span className="font-semibold">{previewData.paymentsCount}</span>
                    </div>
                    {previewData.exportedBy && (
                      <div className="flex justify-between text-sm">
                        <span>{t("exportedBy")}</span>
                        <span className="font-semibold">{previewData.exportedBy}</span>
                      </div>
                    )}
                    {previewData.exportedAt && (
                      <div className="flex justify-between text-sm">
                        <span>{t("exportedAt")}</span>
                        <span className="font-semibold">
                          {new Date(previewData.exportedAt).toLocaleDateString(dateLocale)}
                        </span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {fullPreview && (
                <div className="space-y-3">
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(fullPreview.counts).map(([name, count]) => (
                      <div key={name} className="flex justify-between gap-2">
                        <dt>{backupTableLabels[name]?.[locale === "ru" ? 1 : 0] ?? name}</dt>
                        <dd>{count}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    {locale === "ru" ? "Файлы чеков" : "Chek fayllari"}: {fullPreview.receipts}
                  </p>
                  <label className="block space-y-1">
                    <span>{locale === "ru" ? "Текущий пароль" : "Joriy parol"}</span>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      disabled={loading}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={loading}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    {locale === "ru"
                      ? "Добавить отсутствующие записи. Существующие записи сохраняются; баланс пересчитывается по объединенному журналу."
                      : "Yetishmayotgan yozuvlar qoshilsin. Mavjud yozuvlar saqlanadi; balans birlashgan tarixdan qayta hisoblanadi."}
                  </label>
                </div>
              )}
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("warningTitle")}</AlertTitle>
                <AlertDescription>{t("warningDesc")}</AlertDescription>
              </Alert>
            </>
          )}

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-muted-foreground text-center text-sm">
                {mode === "export" ? t("exporting") : t("importing")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tCommon("cancel")}
          </Button>
          {mode === "export" ? (
            <Button onClick={handleExport} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              {t("exportAction")}
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={loading || !selectedFile || !previewData || (!!fullPreview && (!password || !confirmed))}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("importAction")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
