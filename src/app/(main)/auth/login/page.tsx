import { ExternalLink, Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { LoginForm } from "../_components/login-form";

export default function LoginV2() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-medium">Вход в аккаунт</h1>
          <p className="text-muted-foreground text-sm">Пожалуйста, введите ваши данные для входа.</p>
        </div>
        <div className="space-y-4">
          <LoginForm />
          <p className="text-muted-foreground text-center text-xs">или</p>
          <a
            href="https://easy-debt-demo.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-x-2 rounded-lg bg-blue-100 px-4 text-center text-sm font-medium text-blue-500 hover:bg-blue-100/80 hover:underline dark:bg-blue-900/10"
          >
            Перейти на демо версию
            <ExternalLink width={16} height={16} />
          </a>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="text-muted-foreground size-4" />
          UZB | RUS
        </div>
      </div>
    </>
  );
}
