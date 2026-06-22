/**
 * Client-side HTTP helpers for debtor list actions (no UI).
 * Router.refresh / toast — chaqiruvchi komponentda.
 */

export async function deleteDebtorById(debtorId: number): Promise<boolean> {
  const response = await fetch(`/api/debtors/${debtorId}`, { method: "DELETE" });
  return response.ok;
}

export async function bulkDeleteDebtors(ids: number[]): Promise<boolean> {
  const response = await fetch("/api/debtors/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return response.ok;
}
