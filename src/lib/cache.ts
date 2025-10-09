import { unstable_cache } from "next/cache";

export const CACHE_TAGS = {
  debtors: "debtors",
  debts: "debts",
  payments: "payments",
  settings: "settings",
  users: "users",
} as const;

export const CACHE_REVALIDATE = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  day: 86400, // 24 hours
} as const;

// Helper function for cached queries
export function cachedQuery<T>(
  fn: () => Promise<T>,
  keys: string[],
  options?: {
    revalidate?: number;
    tags?: string[];
  },
) {
  return unstable_cache(fn, keys, {
    revalidate: options?.revalidate ?? CACHE_REVALIDATE.medium,
    tags: options?.tags ?? [],
  });
}
