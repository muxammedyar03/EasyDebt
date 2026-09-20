"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
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
  const labels: Record<string, [string, string]> = {
    users: ["Xodimlar", "Сотрудники"],
    settings: ["Sozlamalar", "Настройки"],
    debtors: ["Qarzdorlar", "Должники"],
    debts: ["Qarzlar", "Долги"],
    payments: ["Tolovlar", "Платежи"],
    payment_reminders: ["Eslatmalar", "Напоминания"],
    companies: ["Kompaniyalar", "Компании"],
    company_debts: ["Kompaniya qarzlari", "Долги компаниям"],
    company_payments: ["Kompaniya tolovlari", "Платежи компаниям"],
    company_daily_snapshots: ["Kunlik tarix", "История по дням"],
    notifications: ["Bildirishnomalar", "Уведомления"],
    audit_logs: ["Audit tarixi", "Журнал аудита"],
    import_history: ["Import tarixi", "История импорта"],
    push_subscriptions: ["Qurilma obunalari", "Подписки устройств"],
    user_push_preferences: ["Bildirishnoma sozlamalari", "Настройки уведомлений"],
  };
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
    <section className="space-y-4 rounded-md border p-4" aria-busy={busy}>
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
      <Button disabled={busy || !password} onClick={() => void run("export")}>
        {ru ? "Скачать копию" : "Nusxani yuklab olish"}
      </Button>
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
          <Button variant="destructive" disabled={busy || !password || !confirmed} onClick={() => void run("restore")}>
            {ru ? "Восстановить магазин" : "Magazinni tiklash"}
          </Button>
        </div>
      )}
      <p role="status" className="text-sm">
        {busy ? (ru ? "Выполняется…" : "Bajarilmoqda…") : message}
      </p>
    </section>
  );
}
