function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getQuickRanges(now = new Date()) {
  const thisMonthFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastMonthFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthTo = new Date(now.getFullYear(), now.getMonth(), 0);
  const last3From = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const last6From = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  return {
    thisMonth: { dateFrom: toInputDate(thisMonthFrom), dateTo: toInputDate(thisMonthTo) },
    lastMonth: { dateFrom: toInputDate(lastMonthFrom), dateTo: toInputDate(lastMonthTo) },
    last3Months: { dateFrom: toInputDate(last3From), dateTo: toInputDate(thisMonthTo) },
    last6Months: { dateFrom: toInputDate(last6From), dateTo: toInputDate(thisMonthTo) },
  };
}
