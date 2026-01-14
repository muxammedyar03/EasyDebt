import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function getPaymentTypeClass(currency: "CARD" | "CLICK" | "CASH" | "Karta" | "Naqd" | "Click") {
  if (!currency) return "bg-gray-600";
  if (currency === "CASH" || currency === "Naqd")
    return "bg-orange-600/10 border-orange-600/30 dark:text-orange-500 text-orange-700";
  if (currency === "CLICK" || currency === "Click")
    return "bg-indigo-600/10 border-indigo-600/30 dark:border-indigo-400/30 dark:text-indigo-500 text-indigo-700";
  if (currency === "CARD" || currency === "Karta")
    return "bg-emerald-600/10 border-emerald-600/30 dark:text-emerald-500 text-emerald-700";
  return "bg-gray-100 border-gray-300 text-gray-800";
}
