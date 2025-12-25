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
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success("Ma'lumotlar muvaffaqiyatli export qilindi", {
        description: `${data.meta.debtorsCount} ta qarzdor, ${data.meta.debtsCount} ta qarz, ${data.meta.paymentsCount} ta to'lov`,
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

    // Faylni o'qish va preview ko'rsatish
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.meta || !data.debtors) {
        throw new Error("Noto'g'ri fayl formati");
      }

      setPreviewData({
        debtorsCount: data.meta.debtorsCount || data.debtors.length,
        debtsCount: data.meta.debtsCount || 0,
        paymentsCount: data.meta.paymentsCount || 0,
        exportedBy: data.meta.exportedBy,
        exportedAt: data.meta.exportedAt,
      });
    } catch (error) {
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
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      setProgress(30);

      const response = await fetch("/api/debtors/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      setProgress(70);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import muvaffaqiyatsiz");
      }

      setProgress(100);
      toast.success("Ma'lumotlar muvaffaqiyatli import qilindi", {
        description: `${result.debtorsCount} ta qarzdor, ${result.debtsCount} ta qarz, ${result.paymentsCount} ta to'lov yaratildi`,
      });

      onOpenChange(false);

      // Sahifani yangilash
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Import error:", error);
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
                Ma&apos;lumotlarni Export qilish
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Ma&apos;lumotlarni Import qilish
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "export"
              ? "Barcha qarzdorlar va ularning qarzlari JSON formatda yuklab olinadi"
              : "JSON fayldan qarzdorlar va qarzlarni import qiling"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "export" ? (
            <Alert>
              <FileJson className="h-4 w-4" />
              <AlertTitle>Export formati: JSON</AlertTitle>
              <AlertDescription>
                Barcha ma&apos;lumotlar nested strukturada saqlanadi. Import qilish uchun bu faylni ishlatishingiz
                mumkin.
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
                    {selectedFile ? selectedFile.name : "JSON fayl tanlang"}
                  </Button>
                </label>
              </div>

              {previewData && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Fayl ma&apos;lumotlari</AlertTitle>
                  <AlertDescription className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Qarzdorlar:</span>
                      <span className="font-semibold">{previewData.debtorsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Qarzlar:</span>
                      <span className="font-semibold">{previewData.debtsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>To&apos;lovlar:</span>
                      <span className="font-semibold">{previewData.paymentsCount}</span>
                    </div>
                    {previewData.exportedBy && (
                      <div className="flex justify-between text-sm">
                        <span>Export qilgan:</span>
                        <span className="font-semibold">{previewData.exportedBy}</span>
                      </div>
                    )}
                    {previewData.exportedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Export sanasi:</span>
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
                  Import paytida yangi ma&apos;lumotlar yaratiladi. Mavjud ma&apos;lumotlar o&apos;zgartirilmaydi.
                  Duplicate ma&apos;lumotlar avtomatik aniqlanadi.
                </AlertDescription>
              </Alert>
            </>
          )}

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-muted-foreground text-center text-sm">
                {mode === "export" ? "Export qilinmoqda..." : "Import qilinmoqda..."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Bekor qilish
          </Button>
          {mode === "export" ? (
            <Button onClick={handleExport} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Export qilish
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={loading || !selectedFile}>
              <Upload className="mr-2 h-4 w-4" />
              Import qilish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
