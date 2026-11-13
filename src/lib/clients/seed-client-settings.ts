import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  { key: "debt_limit", value: "2000000" },
  { key: "overdue_days", value: "45" },
];

export async function seedClientSettings(clientId: number, tx: Prisma.TransactionClient = prisma) {
  for (const setting of DEFAULT_SETTINGS) {
    await tx.settings.upsert({
      where: { client_id_key: { client_id: clientId, key: setting.key } },
      update: {},
      create: {
        client_id: clientId,
        key: setting.key,
        value: setting.value,
      },
    });
  }
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "h",
};

export function slugifyClientName(name: string): string {
  const transliterated = name
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

  return (
    transliterated
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "shop"
  );
}
