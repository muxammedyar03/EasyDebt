export type PeriodTimeRange = "daily" | "week" | "month";

export function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayInputDate(): string {
  return toInputDate(new Date());
}

export function parseInputDate(value: string, endOfDay = false): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

export function getPeriodBounds(
  selectedDate: string,
  timeRange: PeriodTimeRange,
): { dateFrom: string; dateTo: string } {
  const selected = parseInputDate(selectedDate) ?? new Date();

  if (timeRange === "daily") {
    return { dateFrom: selectedDate, dateTo: selectedDate };
  }

  if (timeRange === "week") {
    const start = new Date(selected);
    start.setDate(start.getDate() - 6);
    return { dateFrom: toInputDate(start), dateTo: selectedDate };
  }

  const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const endOfMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  return { dateFrom: toInputDate(startOfMonth), dateTo: toInputDate(endOfMonth) };
}

export function navigatePeriodDate(selectedDate: string, timeRange: PeriodTimeRange, direction: number): string {
  const current = parseInputDate(selectedDate) ?? new Date();

  if (timeRange === "daily") {
    current.setDate(current.getDate() + direction);
  } else if (timeRange === "week") {
    current.setDate(current.getDate() + direction * 7);
  } else {
    current.setMonth(current.getMonth() + direction);
  }

  return toInputDate(current);
}

export function canNavigatePeriodForward(selectedDate: string, timeRange: PeriodTimeRange): boolean {
  const today = todayInputDate();
  const { dateTo } = getPeriodBounds(selectedDate, timeRange);
  return dateTo < today;
}

export type ChartPeriod = "week" | "3months" | "year";

export function getChartPeriodBounds(period: ChartPeriod): { dateFrom: Date; dateTo: Date } {
  const dateTo = new Date();
  dateTo.setHours(23, 59, 59, 999);
  const dateFrom = new Date();
  dateFrom.setHours(0, 0, 0, 0);

  if (period === "week") {
    dateFrom.setDate(dateFrom.getDate() - 6);
  } else if (period === "3months") {
    dateFrom.setMonth(dateFrom.getMonth() - 3);
  } else {
    dateFrom.setMonth(0, 1);
  }

  return { dateFrom, dateTo };
}
