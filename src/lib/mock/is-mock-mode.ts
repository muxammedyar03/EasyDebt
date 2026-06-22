/** Server va client: mock ma'lumot rejimi (DB o'rniga in-memory store). */
export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === "true" || process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
}
