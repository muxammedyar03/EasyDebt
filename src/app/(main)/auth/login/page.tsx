import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { DemoLogin } from "../_components/demo-login";
import { t } from "@/lib/i18n";
//demo version
export default function LoginV2() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-medium">{APP_CONFIG.name}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.demoVersion")}</p>
        </div>
        <div className="space-y-4">
          {/* <LoginForm /> */}
          <DemoLogin />
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="text-muted-foreground size-4" />
          ENG
        </div>
      </div>
    </>
  );
}
