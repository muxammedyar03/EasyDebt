import { validatePreferenceCookie } from "../preference-cookie";
it("accepts only supported appearance and locale settings", () => {
  expect(validatePreferenceCookie("theme_mode", "dark", {})).toMatchObject({ path: "/", sameSite: "lax" });
  expect(validatePreferenceCookie("NEXT_LOCALE", "ru", { maxAge: 31536000 }).maxAge).toBe(31536000);
  expect(validatePreferenceCookie("sidebar_collapsible", "icon", {})).toBeTruthy();
});
it.each([
  ["auth-token", "forged", {}],
  ["theme_mode", "javascript:bad", {}],
  ["NEXT_LOCALE", "es", {}],
  ["theme_mode", "dark", { path: "/api" }],
  ["theme_mode", "dark", { maxAge: 31536000 }],
])("rejects a modified cookie name, value or scope: %s", (key, value, options) => {
  expect(() => validatePreferenceCookie(key, value, options)).toThrow();
});
