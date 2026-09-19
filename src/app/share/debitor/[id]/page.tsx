import { notFound } from "next/navigation";
import { PublicDebtorClient } from "./_components/public-debtor-client";
import { debtorService } from "@/lib/services/debtor.service";
import { computeViewValueSync } from "@/features/view-debtor/model";
import { prisma } from "@/lib/prisma";
import { verifyShareToken } from "@/lib/share-token";
import { Clock, Landmark } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ExpiredView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Landmark className="h-6 w-6 text-slate-400" />
          <span className="text-lg font-bold tracking-tight text-slate-400">FEAT MARKET</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/20">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Havola faol emas</h1>

          <p className="mt-4 text-sm leading-relaxed font-medium text-slate-500 dark:text-slate-400">
            Ushbu ulashilgan profiling havolasi muddati tugagan (havolalar xavfsizlik uchun faqat 2 kun davomida faol
            bo&apos;ladi) yoki noto&apos;g&apos;ri.
          </p>

          <p className="text-primary/70 mt-2 text-xs font-semibold">
            Iltimos, yangi havola olish uchun do&apos;kon egasiga murojaat qiling.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function PublicDebtorPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!id || !UUID_REGEX.test(id)) {
    notFound();
  }

  // Verify the JWT token parameter
  if (!token) {
    return <ExpiredView />;
  }

  const scope = await verifyShareToken(token, id);
  if (!scope) {
    return <ExpiredView />;
  }

  // Disabled/moved issuers cannot keep granting access with old links.
  const issuer = await prisma.user.findFirst({
    where: {
      id: scope.issuerUserId,
      is_active: true,
      client: { is_active: true },
      OR: [{ client_id: scope.clientId }, { role: "SUPER_ADMIN" }],
    },
    select: { id: true },
  });
  const client = await prisma.client.findFirst({
    where: { id: scope.clientId, is_active: true },
    select: { id: true },
  });
  if (!issuer || !client) return <ExpiredView />;
  const debtor = await debtorService.findByExternalId(scope.clientId, id, true);

  if (!debtor) {
    notFound();
  }

  const overdueDays = await debtorService.getOverdueDays(debtor.clientId);

  const initialViewValue = computeViewValueSync(debtor, overdueDays);
  return <PublicDebtorClient debtor={debtor} initialViewValue={initialViewValue} />;
}
