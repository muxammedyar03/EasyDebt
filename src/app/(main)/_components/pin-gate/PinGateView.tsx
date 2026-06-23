"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Command } from "lucide-react";
import { APP_CONFIG } from "@/config/app-config";

export type PinGateViewProps = {
  hasPin: boolean | null;
  pinLength: number;
  locked: boolean;
  msg: string | null;
  loading: boolean;
  resetMode: boolean;
  credentials: { login: string; password: string };
  pin: string;
  pinConfirm: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPinChange: (v: string) => void;
  onPinConfirmChange: (v: string) => void;
  onCredentialsChange: (field: "login" | "password", value: string) => void;
  onSetPin: () => void;
  onVerify: () => void;
  onReset: () => void;
  setResetMode: (v: boolean) => void;
};

export function PinGateView(props: PinGateViewProps) {
  const {
    hasPin,
    pinLength,
    msg,
    loading,
    resetMode,
    credentials,
    pin,
    pinConfirm,
    onKeyDown,
    onPinChange,
    onPinConfirmChange,
    onCredentialsChange,
    onSetPin,
    onVerify,
    onReset,
    setResetMode,
  } = props;

  if (hasPin === null) {
    // Loading state while checking if user has a PIN
    return (
      <main>
        <div className="bg-background fixed inset-0 z-[9999] grid h-dvh justify-center p-2 lg:grid-cols-2">
          <div className="bg-primary relative order-2 hidden h-full rounded-3xl lg:flex">
            <div className="text-primary-foreground absolute top-10 space-y-1 px-10">
              <Command className="size-10" />
              <h1 className="text-2xl font-medium">{APP_CONFIG.name}</h1>
              <p className="text-sm">Design. Build. Launch. Repeat.</p>
            </div>
          </div>
          <div className="relative order-1 flex h-full">
            <div className="flex w-full items-center justify-center p-6">
              <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-medium">Yuklanmoqda...</h1>
                  <p className="text-muted-foreground text-sm">Iltimos kuting</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div
        className="bg-background fixed inset-0 z-[9999] grid h-dvh justify-center p-2 lg:grid-cols-2"
        onKeyDown={onKeyDown}
      >
        <div className="bg-primary relative order-2 hidden h-full rounded-3xl lg:flex">
          <div className="text-primary-foreground absolute top-10 space-y-1 px-10">
            <Command className="size-10" />
            <h1 className="text-2xl font-medium">{APP_CONFIG.name}</h1>
            <p className="text-sm">Design. Build. Launch. Repeat.</p>
          </div>
        </div>
        <div className="relative order-1 flex h-full">
          <div className="flex w-full items-center justify-center p-6">
            <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-medium">{hasPin ? "Введите PIN код" : `Установите новый PIN код`}</h1>
                <p className="text-muted-foreground text-sm">
                  {hasPin ? "Для продолжения введите PIN код" : `Пожалуйста, установите ${pinLength} цифровой PIN код`}
                </p>
              </div>

              <div className="space-y-4">
                {msg && <p className="text-destructive text-center text-sm">{msg}</p>}

                {!hasPin ? (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <InputOTP
                            value={pin}
                            onChange={onPinChange}
                            maxLength={pinLength}
                            containerClassName="justify-center"
                          >
                            <InputOTPGroup>
                              {Array.from({ length: pinLength }).map((_, i) => (
                                <InputOTPSlot key={Math.random() * 1000} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Подтвердите PIN код</label>
                        <div className="flex justify-center">
                          <InputOTP
                            value={pinConfirm}
                            onChange={onPinConfirmChange}
                            maxLength={pinLength}
                            containerClassName="justify-center"
                          >
                            <InputOTPGroup>
                              {Array.from({ length: pinLength }).map((_, i) => (
                                <InputOTPSlot key={Math.random() * 1000} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full" onClick={onSetPin} disabled={loading}>
                      {loading ? "Сохраняется..." : "Установка PIN кода"}
                    </Button>
                  </>
                ) : (
                  <>
                    {!resetMode ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-center">
                            <InputOTP
                              value={pin}
                              onChange={onPinChange}
                              maxLength={pinLength}
                              containerClassName="justify-center"
                            >
                              <InputOTPGroup>
                                {Array.from({ length: pinLength }).map((_, i) => (
                                  <InputOTPSlot key={Math.random() * 1000} index={i} />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>

                        <Button className="w-full" onClick={onVerify} disabled={loading}>
                          {loading ? "Проверяется..." : "Вход"}
                        </Button>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                              setResetMode(true);
                            }}
                          >
                            Забыл
                          </Button>
                        </div>
                      </>
                    ) : null}

                    {resetMode && (
                      <>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Логин или Email</label>
                            <input
                              type="text"
                              placeholder="Введите логин или email"
                              value={credentials.login}
                              onChange={(e) => onCredentialsChange("login", e.target.value)}
                              className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Пароль</label>
                            <input
                              type="password"
                              placeholder="********"
                              value={credentials.password}
                              onChange={(e) => onCredentialsChange("password", e.target.value)}
                              className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Новый PIN</label>
                            <div className="flex justify-center">
                              <InputOTP
                                value={pin}
                                onChange={onPinChange}
                                maxLength={pinLength}
                                containerClassName="justify-center"
                              >
                                <InputOTPGroup>
                                  {Array.from({ length: pinLength }).map((_, i) => (
                                    <InputOTPSlot key={Math.random() * 1000} index={i} />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full" onClick={onReset} disabled={loading}>
                          {loading ? "Сбрасывается..." : "Сброс PIN кода"}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setResetMode(false)}>
                          Bekor qilish
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
