export type PermissionPage = {
  key: string;
  label: string;
  route: string;
  actions: readonly { key: string; label: string }[];
};

export const PERMISSION_GROUPS = [
  {
    label: "Asosiy",
    pages: [
      { key: "dashboard.view", label: "Bosh sahifa", route: "/dashboard/default",
        actions: [
          { key: "settings.view", label: "Magazin sozlamalarini ko‘rish" },
          { key: "settings.manage", label: "Magazin sozlamalarini o‘zgartirish" },
        ] },
      {
        key: "debtors.view", label: "Qarzdorlar", route: "/dashboard/debtors",
        actions: [
          { key: "debtors.create", label: "Qarzdor qo‘shish" },
          { key: "debtors.edit", label: "Qarzdorni o‘zgartirish" },
          { key: "debtors.delete", label: "Qarzdorni o‘chirish" },
          { key: "debts.create", label: "Qarz qo‘shish" },
          { key: "debts.edit", label: "Qarzni o‘zgartirish" },
          { key: "debts.delete", label: "Qarzni o‘chirish" },
          { key: "payments.create", label: "To‘lov qo‘shish" },
          { key: "payments.edit", label: "To‘lovni o‘zgartirish" },
          { key: "payments.delete", label: "To‘lovni o‘chirish" },
          { key: "debtors.export", label: "Eksport" },
          { key: "debtors.import", label: "Import" },
          { key: "debtors.share", label: "Qarzdor havolasini ulashish" },
          { key: "reminders.view", label: "To‘lov eslatmalarini ko‘rish" },
          { key: "reminders.manage", label: "To‘lov eslatmalarini boshqarish" },
        ],
      },
      { key: "customers.view", label: "Mijozlar reytingi", route: "/dashboard/customers", actions: [] },
      { key: "notifications.view", label: "Bildirishnomalar", route: "/dashboard/notifications",
        actions: [{ key: "notifications.manage", label: "Bildirishnomani boshqarish" }] },
    ],
  },
  {
    label: "Kompaniyalar",
    pages: [
      {
        key: "companies.view", label: "Mening qarzlarim", route: "/dashboard/my-debts",
        actions: [
          { key: "companies.create", label: "Kompaniya qo‘shish" },
          { key: "companies.edit", label: "Kompaniyani o‘zgartirish" },
          { key: "companies.delete", label: "Kompaniyani o‘chirish" },
          { key: "company-debts.create", label: "Qarz qo‘shish" },
          { key: "company-debts.edit", label: "Qarzni o‘zgartirish" },
          { key: "company-payments.create", label: "To‘lov qo‘shish" },
          { key: "company-payments.edit", label: "To‘lovni o‘zgartirish" },
          { key: "companies.export", label: "Kompaniyalarni eksport qilish" },
        ],
      },
      { key: "company-receipts.view", label: "To‘lov cheklari", route: "/dashboard/company-receipts",
        actions: [{ key: "company-receipts.delete", label: "Chekni o‘chirish" }] },
      { key: "company-reports.view", label: "Kompaniya hisobotlari", route: "/dashboard/my-debts/report",
        actions: [{ key: "company-reports.export", label: "Eksport" }] },
    ],
  },
  {
    label: "Hisobotlar",
    pages: [
      { key: "reports.view", label: "Hisobotlar", route: "/dashboard/reports", actions: [{ key: "reports.export", label: "Eksport" }] },
      { key: "audit.view", label: "Audit log", route: "/dashboard/audit-logs", actions: [
        { key: "audit.export", label: "Eksport" },
        { key: "audit.undo", label: "Amalni ortga qaytarish" },
      ] },
    ],
  },
  {
    label: "Boshqaruv",
    pages: [
      {
        key: "users.view", label: "Xodimlar", route: "/dashboard/users",
        actions: [
          { key: "users.create", label: "Xodim qo‘shish" },
          { key: "users.edit", label: "Xodimni o‘zgartirish" },
          { key: "users.delete", label: "Xodimni o‘chirish" },
        ],
      },
      {
        key: "clients.view", label: "Magazinlar", route: "/dashboard/clients",
        actions: [
          { key: "clients.manage", label: "Magazinni boshqarish" },
          { key: "tenant.backup", label: "Backup va restore" },
        ],
      },
      {
        key: "permissions.view", label: "Ruxsatlar", route: "/dashboard/permissions",
        actions: [{ key: "permissions.manage", label: "Magazin va xodim ruxsatlarini boshqarish" }],
      },
      { key: "profile.view", label: "Profil", route: "/dashboard/profile/me",
        actions: [{ key: "profile.edit", label: "Profilni o‘zgartirish" }] },
      { key: "push-settings.view", label: "Push xabarnomalar", route: "/dashboard/push-notifications",
        actions: [{ key: "push-settings.manage", label: "Push sozlamalarini o‘zgartirish" }] },
      { key: "layout-settings.view", label: "Interfeys sozlamalari", route: "/dashboard/layout-settings",
        actions: [{ key: "layout-settings.manage", label: "Interfeysni o‘zgartirish" }] },
    ],
  },
] as const satisfies readonly { label: string; pages: readonly PermissionPage[] }[];

export const PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.pages.flatMap((page) => [page.key, ...page.actions.map((action) => action.key)]),
);
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
const known = new Set<string>(PERMISSION_KEYS);
const parents = new Map<string, PermissionKey>(
  PERMISSION_GROUPS.flatMap((group) => group.pages.flatMap((page) =>
    page.actions.map((action) => [action.key, page.key] as [string, PermissionKey]))),
);
export function isPermissionKey(key: string): key is PermissionKey {
  return known.has(key);
}
export function permissionParentKey(key: PermissionKey): PermissionKey | undefined {
  return parents.get(key);
}

// Role defaults preserve access for existing shops until an override is saved.
export function roleDefault(role: string, key: PermissionKey): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (key === "clients.view" || key === "clients.manage" || key === "tenant.backup" || key.startsWith("company-receipts."))
    return false;
  if (role === "ADMIN") return true;
  if (role !== "USER") return false;
  if (key.startsWith("users.") || key.startsWith("permissions.") || key === "settings.manage" || key === "audit.undo") return false;
  if (key.endsWith(".delete")) return false;
  return true;
}

/** Explicit denies always win; a user override cannot bypass a disabled shop. */
export function effectivePermission(
  role: string,
  key: PermissionKey,
  platform: boolean | undefined,
  client: boolean | undefined,
  user: boolean | undefined,
): boolean {
  if (key === "clients.view" || key === "clients.manage" || key === "tenant.backup" || key === "company-receipts.view")
    return role === "SUPER_ADMIN" && platform !== false;
  if ((key.startsWith("users.") || key.startsWith("permissions.")) && role !== "ADMIN" && role !== "SUPER_ADMIN")
    return false;
  if (role === "SUPER_ADMIN" && (key === "permissions.view" || key === "permissions.manage"))
    return platform !== false;
  return platform !== false && client !== false && (user ?? roleDefault(role, key));
}
