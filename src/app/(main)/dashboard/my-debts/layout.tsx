import { redirect } from "next/navigation";

import { ScopedPinGate } from "@/app/(main)/_components/pin-gate/ScopedPinGate";
import { getSession } from "@/lib/auth";

export default async function MyDebtsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/auth/login");
  }

  return (
    <ScopedPinGate userId={session.userId} scope="my-debts">
      {children}
    </ScopedPinGate>
  );
}
