/**
 * VAPID Keys Management
 *
 * VAPID (Voluntary Application Server Identification) keys are used to identify
 * your application server to push services. These keys must be generated once
 * and stored securely in environment variables.
 */

export function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys are not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables. " +
        "Run: npm run generate:vapid-keys",
    );
  }

  return {
    publicKey,
    privateKey,
  };
}

export function getVapidPublicKey(): string {
  const { publicKey } = getVapidKeys();
  return publicKey;
}
