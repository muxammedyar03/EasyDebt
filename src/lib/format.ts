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

export function formatDateUz(dateInput: Date | string, withTime: boolean = false): string {
  // Convert string to Date if needed
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date:", dateInput);
    return "--/--/----";
  }

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

  return `${kun}-${oy}/${yil}${
    withTime
      ? " | " +
        date.toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : ""
  }`;
}

export function formatCurrencyUzs(amount: number) {
  // Use a consistent number format that works on both server and client
  return (
    new Intl.NumberFormat("uz-UZ", {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " so'm"
  );
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
