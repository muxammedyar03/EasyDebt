import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // Only SUPER_ADMIN can access admin pages
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
