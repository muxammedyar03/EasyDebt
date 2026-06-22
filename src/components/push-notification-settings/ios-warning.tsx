interface IOSWarningProps {
  isIOSDevice: boolean;
  isIOSPWA: boolean;
}

export function IOSWarning({ isIOSDevice, isIOSPWA }: IOSWarningProps) {
  if (!isIOSDevice || isIOSPWA) {
    return null;
  }

  return (
    <>
      <p className="mb-2 font-medium">iOS Safari cheklovlari</p>
      <p className="mb-2">
        iOS Safari&apos;da push notificationlar faqat PWA (Progressive Web App) sifatida o&apos;rnatilgan app&apos;da
        ishlaydi.
      </p>
      <p>Push notificationlarni ishlatish uchun:</p>
      <ol className="mt-2 list-inside list-decimal space-y-1">
        <li>Share tugmasini bosing (⬆️)</li>
        <li>&quot;Add to Home Screen&quot; ni tanlang</li>
        <li>O&apos;rnatilgan app&apos;ni oching</li>
        <li>Push notification sozlamalarini qayta urinib ko&apos;ring</li>
      </ol>
    </>
  );
}
