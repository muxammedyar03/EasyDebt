CREATE UNIQUE INDEX "notifications_id_client_id_key" ON "notifications"("id", "client_id");
CREATE TABLE "push_deliveries" (
  "id" SERIAL PRIMARY KEY,
  "client_id" INTEGER NOT NULL,
  "notification_id" INTEGER NOT NULL,
  "subscription_id" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'SENT', 'CANCELLED', 'FAILED')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_token" UUID,
  "locked_until" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  CONSTRAINT "push_deliveries_notification_id_client_id_fkey" FOREIGN KEY ("notification_id", "client_id") REFERENCES "notifications"("id", "client_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "push_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "push_deliveries_notification_id_subscription_id_key" ON "push_deliveries"("notification_id", "subscription_id");
CREATE INDEX "push_deliveries_status_available_at_locked_until_idx" ON "push_deliveries"("status", "available_at", "locked_until");
CREATE INDEX "push_deliveries_client_id_idx" ON "push_deliveries"("client_id");
