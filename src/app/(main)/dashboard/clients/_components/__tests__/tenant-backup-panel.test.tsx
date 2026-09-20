/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { TenantBackupPanel } from "../tenant-backup-panel";
jest.mock("next-intl", () => ({ useLocale: () => "uz" }));
it("opens a modal, separates download/restore and clears credentials when closed", () => {
  render(<TenantBackupPanel clientId={1} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Magazin zaxira nusxasi" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Nusxani yuklab olish" })).toBeTruthy();
  expect(screen.queryByText("Tekshirish uchun nusxani tanlang")).toBeNull();
  fireEvent.change(screen.getByLabelText("Joriy parolingiz"), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: "Tiklash" }));
  expect(screen.getByLabelText("Tekshirish uchun nusxani tanlang")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Nusxani yuklab olish" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("button", { name: "Magazin zaxira nusxasi" }));
  expect((screen.getByLabelText("Joriy parolingiz") as HTMLInputElement).value).toBe("");
});
