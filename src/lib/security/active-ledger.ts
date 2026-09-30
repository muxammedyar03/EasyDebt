/** Keep cancellation pairs in history while excluding both sides from aging and rating. */
export function activeLedgerEntries<T extends { id: number }>(
  rows: T[],
  reversedId: (row: T) => number | null | undefined,
): T[] {
  const reversed = new Set(rows.map(reversedId).filter((id): id is number => id != null));
  return rows.filter((row) => reversedId(row) == null && !reversed.has(row.id));
}
