import { companyDay, companyDayRange, parseCompanyDay } from "../company-report-date";

it("uses Tashkent midnight regardless of the Node process timezone", () => {
  expect(companyDay(new Date("2026-01-01T18:59:59.999Z")).toISOString()).toBe("2026-01-01T00:00:00.000Z");
  expect(companyDay(new Date("2026-01-01T19:00:00Z")).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  const range = companyDayRange(new Date("2026-01-02T00:00:00Z"));
  expect(range.gte.toISOString()).toBe("2026-01-01T19:00:00.000Z");
  expect(range.lte.toISOString()).toBe("2026-01-02T18:59:59.999Z");
});

it("rejects overflow dates instead of silently moving the report to another month", () => {
  expect(parseCompanyDay("2026-02-30")).toBeNull();
  expect(parseCompanyDay("2026-13-01")).toBeNull();
  expect(parseCompanyDay("2026-1-1")).toBeNull();
  expect(parseCompanyDay("2024-02-29")?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
});
