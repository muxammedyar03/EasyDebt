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
                <h1 className="text-3xl font-medium">{hasPin ? "Pin kodni kiriting" : `Yangi PIN o'rnatish`}</h1>
                <p className="text-muted-foreground text-sm">
                  {hasPin ? "Davom etish uchun pin kodni kiriting" : `Iltimos ${pinLength} raqamli PIN o'rnating`}
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
                                <InputOTPSlot key={i.toString()} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">PIN kodni tasdiqlang</label>
                        <div className="flex justify-center">
                          <InputOTP
                            value={pinConfirm}
                            onChange={onPinConfirmChange}
                            maxLength={pinLength}
                            containerClassName="justify-center"
                          >
                            <InputOTPGroup>
                              {Array.from({ length: pinLength }).map((_, i) => (
                                <InputOTPSlot key={i.toString()} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full" onClick={onSetPin} disabled={loading}>
                      {loading ? "Saqlanmoqda..." : "PIN o'rnatish"}
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
                                  <InputOTPSlot key={i.toString()} index={i} />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>

                        <Button className="w-full" onClick={onVerify} disabled={loading}>
                          {loading ? "Tekshirilmoqda..." : "Kirish"}
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
                            Unutdim
                          </Button>
                        </div>
                      </>
                    ) : null}

                    {resetMode && (
                      <>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Login yoki Email</label>
                            <input
                              type="text"
                              placeholder="Login yoki email kiriting"
                              value={credentials.login}
                              onChange={(e) => onCredentialsChange("login", e.target.value)}
                              className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Parol</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={credentials.password}
                              onChange={(e) => onCredentialsChange("password", e.target.value)}
                              className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Yangi PIN</label>
                            <div className="flex justify-center">
                              <InputOTP
                                value={pin}
                                onChange={onPinChange}
                                maxLength={pinLength}
                                containerClassName="justify-center"
                              >
                                <InputOTPGroup>
                                  {Array.from({ length: pinLength }).map((_, i) => (
                                    <InputOTPSlot key={i.toString()} index={i} />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full" onClick={onReset} disabled={loading}>
                          {loading ? "So'ralmoqda..." : "PIN tiklash"}
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
