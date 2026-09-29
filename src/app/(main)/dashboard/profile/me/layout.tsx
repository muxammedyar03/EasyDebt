import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasPermission(await getSession(), "profile.view"))) redirect("/unauthorized");
  return children;
}
