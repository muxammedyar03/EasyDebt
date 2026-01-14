// Formatting helpers
// Phone: +998 XX XXX XX XX
export const formatUzPhone = (input: string): string => {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  let rest = digits;
  if (rest.startsWith("998")) {
    rest = rest.slice(3);
  }
  // Limit to 9 digits after country code
  rest = rest.slice(0, 9);
  const part1 = rest.slice(0, 2);
  const part2 = rest.slice(2, 5);
  const part3 = rest.slice(5, 7);
  const part4 = rest.slice(7, 9);
  let out = "+998";
  if (part1) out += ` ${part1}`;
  if (part2) out += ` ${part2}`;
  if (part3) out += ` ${part3}`;
  if (part4) out += ` ${part4}`;
  return out;
};

// Numbers: group by thousands using spaces (e.g., 1234567 -> "1 234 567")
export const formatNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

export function formatDateUz(date: Date): string {
  const oylar = [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentyabr",
    "oktyabr",
    "noyabr",
    "dekabr",
  ];

  const kun = date.getDate();
  const oy = oylar[date.getMonth()];
  const yil = date.getFullYear();

  return `${kun}-${oy}/${yil}`;
}

export function formatCurrencyUzs(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
