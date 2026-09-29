import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";
import { PermissionsManager } from "./permissions-manager";

export default async function PermissionsPage() {
  const session = await getSession();
  if (!session || !(await hasPermission(session, "permissions.view"))) redirect("/unauthorized");
  return <PermissionsManager isSuperAdmin={session.role === "SUPER_ADMIN"} />;
}
