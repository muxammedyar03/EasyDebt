-- Overrides are sparse: absence keeps the existing role-based access during rollout.
CREATE TABLE "platform_permissions" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_permissions_key_key" ON "platform_permissions"("key");

CREATE TABLE "client_permissions" (
  "id" SERIAL NOT NULL,
  "client_id" INTEGER NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_permissions_client_id_key_key" ON "client_permissions"("client_id", "key");
CREATE INDEX "client_permissions_client_id_idx" ON "client_permissions"("client_id");
ALTER TABLE "client_permissions" ADD CONSTRAINT "client_permissions_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "users_id_client_id_key" ON "users"("id", "client_id");
CREATE TABLE "user_permissions" (
  "id" SERIAL NOT NULL,
  "client_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_permissions_user_id_key_key" ON "user_permissions"("user_id", "key");
CREATE INDEX "user_permissions_client_id_idx" ON "user_permissions"("client_id");
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_client_id_fkey"
  FOREIGN KEY ("user_id", "client_id") REFERENCES "users"("id", "client_id") ON DELETE CASCADE ON UPDATE CASCADE;
