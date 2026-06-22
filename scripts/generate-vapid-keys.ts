/**
 * Generate VAPID keys for Web Push Notifications
 *
 * Run this script to generate VAPID keys:
 *   npm run generate:vapid-keys
 *
 * Then add the keys to your .env file:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 */

import * as webPush from "web-push";

try {
  const vapidKeys = webPush.generateVAPIDKeys();

  console.log("\n✅ VAPID keys generated successfully!\n");
  console.log("Add these to your .env file:\n");
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`);
  console.log("Also set the VAPID subject (your contact email or URL):");
  console.log("VAPID_SUBJECT=mailto:your-email@example.com\n");
} catch (error) {
  console.error("Failed to generate VAPID keys:", error);
  process.exit(1);
}
