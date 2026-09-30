import { userAuditFields } from "../user-audit";

it("keeps credentials and PIN out of audit snapshots", () => {
  const user = {
    username: "employee", email: "e@example.com", role: "USER", is_active: true,
    first_name: null, last_name: null,
    password: "sensitive-hash", pin: "sensitive-pin",
  } as const;
  const snapshot = userAuditFields(user);
  expect(snapshot).toEqual({ username: "employee", email: "e@example.com", role: "USER",
    is_active: true, first_name: null, last_name: null });
  expect(JSON.stringify(snapshot)).not.toMatch(/password|pin|sensitive/);
});
