/** Business dates are Asia/Tashkent days, independent of the server's TZ. */
export const COMPANY_TIME_ZONE = "Asia/Tashkent";
const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: COMPANY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parts(date: Date) {
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, Number(part.value)]));
}

/** UTC midnight is a date label, not the instant at which the shop day starts. */
export function companyDay(date: Date = new Date()): Date {
  const p = parts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

export function parseCompanyDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function midnight(label: Date): number {
  const target = label.getTime();
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = parts(new Date(candidate));
    const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    if (local === target) return candidate;
    candidate += target - local;
  }
  throw new Error("Cannot resolve company business day");
}

export function companyDayRange(date: Date): { gte: Date; lte: Date } {
  const label = companyDay(date);
  const next = new Date(label);
  next.setUTCDate(next.getUTCDate() + 1);
  return { gte: new Date(midnight(label)), lte: new Date(midnight(next) - 1) };
}
