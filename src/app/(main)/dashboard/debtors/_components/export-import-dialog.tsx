"use client";

import * as React from "react";
import { Download, Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
import { Progress } from "@/components/ui/progress";

interface ExportImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "export" | "import";
}

export function ExportImportDialog({ open, onOpenChange, mode }: ExportImportDialogProps) {
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
  /** Bir marta o‘qilgan JSON matn — importda qayta file.text() qilmaymiz */
  const importJsonTextRef = React.useRef<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setProgress(10);

    try {
      const response = await fetch("/api/debtors/export-json");
      setProgress(50);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export muvaffaqiyatsiz");
      }

      const data = await response.json();
      setProgress(80);

      // JSON faylni yuklab olish
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
      toast.success("Материалы успешно экспортированы", {
        description: `${data.meta.debtorsCount} дебиторов, ${data.meta.debtsCount} долгов, ${data.meta.paymentsCount} платежей`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export paytida xatolik", {
        description: error instanceof Error ? error.message : "Noma'lum xatolik",
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Faqat JSON fayllar qabul qilinadi");
      return;
    }

    setSelectedFile(file);

    // Faylni bir marta o'qish va preview ko'rsatish
    try {
      const text = await file.text();
      importJsonTextRef.current = text;
      const data = JSON.parse(text) as {
        meta?: {
          debtorsCount?: number;
          debtsCount?: number;
          paymentsCount?: number;
          exportedBy?: string;
          exportedAt?: string;
        };
        debtors?: unknown[];
      };

      if (!data.meta || !data.debtors) {
        throw new Error("Noto'g'ri fayl formati");
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
      toast.error("Faylni o'qishda xatolik", {
        description: error instanceof Error ? error.message : "Noma'lum xatolik",
      });
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Iltimos fayl tanlang");
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      const text = importJsonTextRef.current;
      if (!text) {
        throw new Error("Fayl matni yo‘q — qayta tanlang");
      }
      setProgress(25);

      // Gzip: JSON tarmoqda kichrayadi (nginx 1m limitidan oson chetlashadi). Stream emas, lekin hajm kamayadi.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
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
          throw new Error(
            "Fayl juda katta (413). Agar yangi versiya bo‘lsa, avvalo yangilang (import gzip bilan yuboriladi). Aks holda nginx’da client_max_body_size oshiring.",
          );
        }
        throw new Error(
          response.status >= 500
            ? `Server xatosi (${response.status})`
            : "Server JSON emas qaytardi — ehtimol proxy/nginx xatosi.",
        );
      }

      if (!response.ok) {
        throw new Error(result.error || "Import muvaffaqiyatsiz");
      }

      setProgress(100);
      toast.success("Материалы успешно импортированы", {
        description: `${result.debtorsCount} дебиторов, ${result.debtsCount} долгов, ${result.paymentsCount} платежей`,
      });

      onOpenChange(false);

      // Sahifani yangilash
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Import error:", error instanceof Error ? error.message : "Noma'lum xatolik");
      toast.error("Import paytida xatolik", {
        description: error instanceof Error ? error.message : "Noma'lum xatolik",
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const resetDialog = () => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "export" ? (
              <>
                <Download className="h-5 w-5" />
                Экспортировать материалы
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Импортировать материалы
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "export"
              ? "Barcha дебиторы и их долги в формате JSON загружаются"
              : "JSON файл из дебиторов и их долгов импортируется"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "export" ? (
            <Alert>
              <FileJson className="h-4 w-4" />
              <AlertTitle>Формат экспорта: JSON</AlertTitle>
              <AlertDescription>
                Barcha материалы хранятся в вложенной структуре. Импортировать можно используя этот файл. mumkin.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
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
                    {selectedFile ? selectedFile.name : "Выберите JSON файл"}
                  </Button>
                </label>
              </div>

              {previewData && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Информация о файле</AlertTitle>
                  <AlertDescription className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Дебиторы:</span>
                      <span className="font-semibold">{previewData.debtorsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Долги:</span>
                      <span className="font-semibold">{previewData.debtsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Платежи:</span>
                      <span className="font-semibold">{previewData.paymentsCount}</span>
                    </div>
                    {previewData.exportedBy && (
                      <div className="flex justify-between text-sm">
                        <span>Экспортировал:</span>
                        <span className="font-semibold">{previewData.exportedBy}</span>
                      </div>
                    )}
                    {previewData.exportedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Дата экспорта:</span>
                        <span className="font-semibold">
                          {new Date(previewData.exportedAt).toLocaleDateString("uz-UZ")}
                        </span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Diqqat!</AlertTitle>
                <AlertDescription>
                  При импорте новые материалы создаются. Существующие материалы не изменяются. Duplicate материалы
                  автоматически определяются.
                </AlertDescription>
              </Alert>
            </>
          )}

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-muted-foreground text-center text-sm">
                {mode === "export" ? "Экспортируется..." : "Импортируется..."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          {mode === "export" ? (
            <Button onClick={handleExport} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Экспортировать
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={loading || !selectedFile}>
              <Upload className="mr-2 h-4 w-4" />
              Импортировать
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
