"use client";

import React from "react";
import { Command } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { APP_CONFIG } from "@/config/app-config";

type SecurePinOTPProps = {
  instanceKey: number;
  pinLength: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
};

function SecurePinOTP({
  instanceKey,
  pinLength,
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  inputRef,
}: SecurePinOTPProps) {
  const [editable, setEditable] = React.useState(false);
  const internalRef = React.useRef<HTMLInputElement>(null);
  const otpName = React.useMemo(() => `gate-otp-${instanceKey}`, [instanceKey]);

  const setRefs = React.useCallback(
    (node: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof inputRef === "function") {
        inputRef(node);
      } else if (inputRef) {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [inputRef],
  );

  React.useEffect(() => {
    setEditable(false);
    const timer = window.setTimeout(() => setEditable(true), 150);
    return () => window.clearTimeout(timer);
  }, [instanceKey]);

  React.useEffect(() => {
    if (!editable || disabled) return;
    if (!autoFocus) return;
    const focusTimer = window.setTimeout(() => internalRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [editable, autoFocus, disabled, instanceKey]);

  const slots = Array.from({ length: pinLength }, (_, i) => <InputOTPSlot key={i} index={i} />);

  return (
    <InputOTP
      key={instanceKey}
      ref={setRefs}
      disabled={disabled}
      readOnly={!editable}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      maxLength={pinLength}
      autoComplete="off"
      pushPasswordManagerStrategy="none"
      name={otpName}
      data-lpignore="true"
      data-1p-ignore
      data-form-type="other"
      containerClassName="justify-center"
      onFocus={() => setEditable(true)}
    >
      <InputOTPGroup>{slots}</InputOTPGroup>
    </InputOTP>
  );
}

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
  pinInputKey: number;
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
    pinInputKey,
    onKeyDown,
    onPinChange,
    onPinConfirmChange,
    onCredentialsChange,
    onSetPin,
    onVerify,
    onReset,
    setResetMode,
  } = props;

  const t = useTranslations("pinGate");
  const tCommon = useTranslations("common");
  const pinInputRef = React.useRef<HTMLInputElement>(null);
  const pinConfirmRef = React.useRef<HTMLInputElement>(null);
  const loginInputRef = React.useRef<HTMLInputElement>(null);

  const focusPinInput = React.useCallback(() => {
    requestAnimationFrame(() => pinInputRef.current?.focus());
  }, []);

  const focusPinConfirm = React.useCallback(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => pinConfirmRef.current?.focus(), 50);
    });
  }, []);

  React.useEffect(() => {
    if (hasPin === null || loading) return;

    if (resetMode) {
      loginInputRef.current?.focus();
      return;
    }

    // SecurePinOTP becomes editable after 150ms; delay focus to match
    const timer = window.setTimeout(() => focusPinInput(), 200);
    return () => window.clearTimeout(timer);
  }, [hasPin, resetMode, loading, focusPinInput, pinInputKey]);

  React.useEffect(() => {
    if (!msg || pin.length > 0) return;
    const timer = window.setTimeout(() => focusPinInput(), 200);
    return () => window.clearTimeout(timer);
  }, [msg, pin.length, focusPinInput, pinInputKey]);

  if (hasPin === null) {
    return (
      <main>
        <div className="bg-background fixed inset-0 z-[9999] grid h-dvh justify-center p-2 lg:grid-cols-2">
          <div className="bg-primary relative order-2 hidden h-full rounded-3xl lg:flex">
            <div className="text-primary-foreground absolute top-10 space-y-1 px-10">
              <Command className="size-10" />
              <h1 className="text-2xl font-medium">{APP_CONFIG.name}</h1>
              <p className="text-sm">{t("tagline")}</p>
            </div>
          </div>
          <div className="relative order-1 flex h-full">
            <div className="flex w-full items-center justify-center p-6">
              <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-medium">{tCommon("loading")}</h1>
                  <p className="text-muted-foreground text-sm">{tCommon("pleaseWait")}</p>
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
            <p className="text-sm">{t("tagline")}</p>
          </div>
        </div>
        <div className="relative order-1 flex h-full">
          <div className="flex w-full items-center justify-center p-6">
            <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-medium">{hasPin ? t("enterPin") : t("setNewPin")}</h1>
                <p className="text-muted-foreground text-sm">
                  {hasPin ? t("enterPinHint") : t("setPinHint", { length: pinLength })}
                </p>
              </div>

              <form className="space-y-4" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                {msg && <p className="text-destructive text-center text-sm">{msg}</p>}

                {!hasPin ? (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <SecurePinOTP
                            instanceKey={pinInputKey}
                            pinLength={pinLength}
                            inputRef={pinInputRef}
                            autoFocus
                            disabled={loading}
                            value={pin}
                            onChange={onPinChange}
                            onComplete={focusPinConfirm}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("confirmPin")}</label>
                        <div className="flex justify-center">
                          <SecurePinOTP
                            instanceKey={pinInputKey + 1000}
                            pinLength={pinLength}
                            inputRef={pinConfirmRef}
                            disabled={loading}
                            value={pinConfirm}
                            onChange={onPinConfirmChange}
                            onComplete={() => {
                              if (pin === pinConfirm) onSetPin();
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button className="w-full" onClick={onSetPin} disabled={loading}>
                      {loading ? tCommon("saving") : t("setPin")}
                    </Button>
                  </>
                ) : (
                  <>
                    {!resetMode ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-center">
                            <SecurePinOTP
                              instanceKey={pinInputKey}
                              pinLength={pinLength}
                              inputRef={pinInputRef}
                              autoFocus
                              disabled={loading}
                              value={pin}
                              onChange={onPinChange}
                              onComplete={onVerify}
                            />
                          </div>
                        </div>

                        <Button className="w-full" onClick={onVerify} disabled={loading || pin.length < pinLength}>
                          {loading ? t("verifying") : t("enter")}
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
                            {t("forgot")}
                          </Button>
                        </div>
                      </>
                    ) : null}

                    {resetMode && (
                      <>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">{t("loginOrEmail")}</label>
                            <input
                              ref={loginInputRef}
                              type="text"
                              placeholder={t("loginPlaceholder")}
                              autoComplete="off"
                              value={credentials.login}
                              onChange={(e) => onCredentialsChange("login", e.target.value)}
                              className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">{t("password")}</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              value={credentials.password}
                              onChange={(e) => onCredentialsChange("password", e.target.value)}
                              className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">{t("newPin")}</label>
                            <div className="flex justify-center">
                              <SecurePinOTP
                                instanceKey={pinInputKey}
                                pinLength={pinLength}
                                inputRef={pinInputRef}
                                disabled={loading}
                                value={pin}
                                onChange={onPinChange}
                                onComplete={() => {
                                  if (credentials.login && credentials.password) onReset();
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <Button className="w-full" onClick={onReset} disabled={loading}>
                          {loading ? t("resetting") : t("resetPin")}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setResetMode(false)}>
                          {tCommon("cancel")}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
