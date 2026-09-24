/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react";
import CashClient from "../cash-client";
import type { CashReport } from "@/lib/services/reports.service";
const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: jest.fn() }) }));
jest.mock("next-intl", () => ({
  useLocale: () => "uz",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));
const report: CashReport = {
  query: { date: "2026-01-10", range: "daily", paymentsPage: 2, debtsPage: 1 },
  totals: {
    payments_count: 2501,
    debts_count: 0,
    total_payments: "250.10",
    total_debts: "0",
    cash: "250.10",
    card: "0",
    click: "0",
  },
  payments: [],
  debts: [],
};
it("uses full server counts, paginates via URL and resets pages when the period changes", () => {
  render(<CashClient report={report} debtLimit={100} />);
  expect(screen.getByRole("tab", { name: 'paymentsTab:{"count":2501}' })).toBeTruthy();
  const nav = screen.getByRole("navigation", { name: "paymentsList" });
  expect(within(nav).getByText('pageOf:{"current":2,"total":51}')).toBeTruthy();
  fireEvent.click(within(nav).getByRole("button", { name: "next" }));
  expect(replace).toHaveBeenLastCalledWith(
    "/dashboard/reports?date=2026-01-10&range=daily&paymentsPage=3&debtsPage=1",
    { scroll: false },
  );
  fireEvent.click(screen.getByRole("button", { name: "monthly" }));
  expect(replace).toHaveBeenLastCalledWith(
    "/dashboard/reports?date=2026-01-10&range=month&paymentsPage=1&debtsPage=1",
    { scroll: false },
  );
  expect(screen.getByRole("link", { name: "exportCsv" }).getAttribute("href")).toContain("date=2026-01-10&range=daily");
});
