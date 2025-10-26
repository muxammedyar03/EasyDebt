export function isFourDigitPin(value: string): boolean {
  return /^\d{4}$/.test(value);
}

export function onlyDigits(value: string, maxLen = 4): string {
  return value.replace(/\D/g, "").slice(0, maxLen);
}
