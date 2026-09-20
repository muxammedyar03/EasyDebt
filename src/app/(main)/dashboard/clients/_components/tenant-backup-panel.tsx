"use client";
import { backupTableLabels as labels } from "@/lib/tenant-backup/labels";
import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Preview {
  backupId: string;
  clientId: number;
  name: string;
  exportedAt: string;
  counts: Record<string, number>;
  receipts: number;
}
export function TenantBackupPanel({ clientId }: { clientId: number }) {
  const ru = useLocale() === "ru";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"export" | "restore">("export");
  const [password, setPassword] = useState("");
  const [archive, setArchive] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(action: "export" | "preview" | "restore", selectedArchive = archive) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const payload =
        action === "export"
          ? { action, password }
          : action === "preview"
            ? { action, archive: selectedArchive }
            : { action, archive: selectedArchive, password, confirmation: preview?.backupId };
      const response = await fetch("/api/tenant-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      if (action === "export") {
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = `easydebt-shop-${clientId}.edbackup`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(ru ? "Резервная копия скачана" : "Backup yuklab olindi");
      } else if (action === "preview") setPreview(await response.json());
      else {
        setMessage(ru ? "Данные восстановлены. Обновите страницу." : "Malumotlar tiklandi. Sahifani yangilang.");
        setPreview(null);
        setArchive("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
      if (action === "preview") setPreview(null);
    } finally {
      setBusy(false);
      if (action !== "preview") setPassword("");
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (busy) return;
        setOpen(value);
        if (!value) {
          setPassword("");
          setArchive("");
          setPreview(null);
          setConfirmed(false);
          setMessage("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">{ru ? "Резервная копия магазина" : "Magazin zaxira nusxasi"}</Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!busy}
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{ru ? "Резервная копия" : "Zaxira nusxasi"}</DialogTitle>
          <DialogDescription>
            {ru
              ? "Скачайте данные или восстановите магазин из копии."
              : "Malumotlarni yuklab oling yoki nusxadan magazinni tiklang."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button disabled={busy} variant={tab === "export" ? "default" : "outline"} onClick={() => setTab("export")}>
            {ru ? "Скачать" : "Yuklab olish"}
          </Button>
          <Button disabled={busy} variant={tab === "restore" ? "default" : "outline"} onClick={() => setTab("restore")}>
            {ru ? "Восстановить" : "Tiklash"}
          </Button>
        </div>
        <section className="space-y-4" aria-busy={busy}>
          <h2 className="font-semibold">
            {ru ? "Полная резервная копия текущего магазина" : "Joriy magazinning toliq zaxira nusxasi"} (#{clientId})
          </h2>
          <p className="text-muted-foreground text-sm">
            {ru
              ? "Данные магазина, сотрудники, настройки уведомлений, история и файлы чеков. Копия зашифрована. Аккаунты платформенных суперадминистраторов не заменяются."
              : "Magazin malumotlari, xodimlar, bildirishnoma sozlamalari, tarixlar va chek fayllari. Nusxa shifrlanadi. Platforma superadmin akkauntlari almashtirilmaydi."}
          </p>
          <label className="block space-y-1 text-sm">
            <span>{ru ? "Ваш текущий пароль" : "Joriy parolingiz"}</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          {tab === "export" && (
            <Button disabled={busy || !password} onClick={() => void run("export")}>
              {ru ? "Скачать копию" : "Nusxani yuklab olish"}
            </Button>
          )}
          {tab === "restore" && (
            <>
              <label className="block space-y-1 text-sm">
                <span>{ru ? "Выбрать копию для проверки" : "Tekshirish uchun nusxani tanlang"}</span>
                <Input
                  type="file"
                  accept=".edbackup"
                  disabled={busy}
                  onChange={async (e) => {
                    setPreview(null);
                    setConfirmed(false);
                    setArchive("");
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 150 * 1024 * 1024) {
                      setMessage(ru ? "Файл слишком большой" : "Fayl juda katta");
                      return;
                    }
                    try {
                      const text = await file.text();
                      setArchive(text);
                      await run("preview", text);
                    } catch {
                      setMessage(ru ? "Не удалось прочитать файл" : "Faylni oqib bolmadi");
                    }
                  }}
                />
              </label>
              {preview && (
                <div className="space-y-3">
                  <p>
                    {preview.name} — {preview.exportedAt}
                  </p>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(preview.counts).map(([table, count]) => (
                      <div key={table}>
                        <dt>{labels[table]?.[ru ? 1 : 0] ?? table}</dt>
                        <dd>{count}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    {ru ? "Файлы чеков" : "Chek fayllari"}: {preview.receipts}
                  </p>
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={busy}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    {ru
                      ? "Я понимаю: текущие данные этого магазина будут заменены этой копией. Журнал аудита сохраняется."
                      : "Tushundim: shu magazinning joriy malumotlari ushbu nusxa bilan almashtiriladi. Audit tarixi saqlanadi."}
                  </label>
                  <Button
                    variant="destructive"
                    disabled={busy || !password || !confirmed}
                    onClick={() => void run("restore")}
                  >
                    {ru ? "Восстановить магазин" : "Magazinni tiklash"}
                  </Button>
                </div>
              )}
            </>
          )}
          <p role="status" className="text-sm">
            {busy ? (ru ? "Выполняется…" : "Bajarilmoqda…") : message}
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
