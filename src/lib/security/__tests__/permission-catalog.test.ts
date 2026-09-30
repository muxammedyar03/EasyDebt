import { effectivePermission, isPermissionKey, permissionParentKey, PERMISSION_GROUPS, PERMISSION_KEYS, roleDefault } from "../permission-catalog";

describe("permission catalog", () => {
  it("has unique page/action keys and routes", () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
    const routes = PERMISSION_GROUPS.flatMap((group) => group.pages.map((page) => page.route));
    expect(new Set(routes).size).toBe(routes.length);
    expect(isPermissionKey("payments.create")).toBe(true);
    expect(isPermissionKey("not.a.permission")).toBe(false);
    expect(permissionParentKey("payments.create")).toBe("debtors.view");
    expect(permissionParentKey("audit.cancel")).toBe("audit.view");
  });

  it("preserves old role defaults, while allowing grants within role boundaries", () => {
    expect(roleDefault("USER", "debtors.view")).toBe(true);
    expect(roleDefault("USER", "users.view")).toBe(false);
    expect(effectivePermission("USER", "users.view", undefined, undefined, true)).toBe(false);
    expect(effectivePermission("USER", "reports.view", undefined, undefined, true)).toBe(true);
    expect(effectivePermission("ADMIN", "users.view", undefined, undefined, undefined)).toBe(true);
    expect(roleDefault("USER", "audit.undo")).toBe(false);
    expect(roleDefault("USER", "audit.cancel")).toBe(false);
    expect(effectivePermission("ADMIN", "audit.undo", true, false, true)).toBe(false);
  });

  it("never lets a user grant bypass shop or platform denial", () => {
    expect(effectivePermission("USER", "payments.create", true, false, true)).toBe(false);
    expect(effectivePermission("USER", "payments.create", false, true, true)).toBe(false);
    expect(effectivePermission("ADMIN", "payments.create", true, true, false)).toBe(false);
  });

  it("reserves platform-only features for a superadmin", () => {
    expect(effectivePermission("USER", "tenant.backup", true, true, true)).toBe(false);
    expect(effectivePermission("ADMIN", "clients.view", true, true, true)).toBe(false);
  });
});
