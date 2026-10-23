import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { LoginForm } from "../_components/login-form";

export default function LoginV2() {
  return (
    <>
      <div className="relative z-10 mx-auto flex w-full flex-col justify-center space-y-6 py-8 sm:w-[360px]">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-medium">{APP_CONFIG.name}</h1>
          <p className="text-muted-foreground text-sm">Tizimga kirish uchun ma&apos;lumotlaringizni kiriting</p>
        </div>
        <div className="space-y-4">
          <LoginForm />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="text-muted-foreground size-4" />
          UZ / RU
        </div>
      </div>
    </>
  );
}
