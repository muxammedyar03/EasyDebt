import { parseReportQuery, reportPeriod } from "../report-query";
import { csvCell, reportCsvRows } from "../report-csv";
it("uses Tashkent days, a rolling week and the full calendar month", () => {
  const daily = reportPeriod(parseReportQuery({ date: "2026-01-10" }));
  expect(daily.gte.toISOString()).toBe("2026-01-09T19:00:00.000Z");
  expect(daily.lt.toISOString()).toBe("2026-01-10T19:00:00.000Z");
  expect(reportPeriod(parseReportQuery({ date: "2026-01-03", range: "week" })).from).toBe("2025-12-28");
  expect(reportPeriod(parseReportQuery({ date: "2024-02-29", range: "month" })).to).toBe("2024-02-29");
});
it.each([
  { date: "2026-02-30" },
  { date: ["2026-01-01"] },
  { range: "all" },
  { paymentsPage: "0" },
  { debtsPage: "-1" },
  { paymentsPage: "1.2" },
  { paymentsPage: "Infinity" },
])("rejects invalid query %p", (params) => {
  expect(() => parseReportQuery(params)).toThrow();
});
it("escapes CSV delimiters and spreadsheet formulas", () => {
  expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  expect(csvCell(" =SUM(A1)")).toBe('"\' =SUM(A1)"');
  expect(csvCell("\tcommand")).toBe('"\'\tcommand"');
  expect(csvCell("10.20")).toBe('"10.20"');
});

it("keeps negative numeric amounts usable by spreadsheets", () => {
  expect(
    reportCsvRows([
      {
        kind: "payment",
        id: 1,
        debtor_id: 1,
        debtor_external_id: "x",
        debtor_name: "Test",
        amount: "-10.20",
        payment_type: "CASH",
        note: null,
        created_at: "2026-01-01T00:00:00Z",
        debitor_total_debt: "0",
        debitor_is_overdue: false,
      },
    ]),
  ).toContain(',"-10.20",');
});
