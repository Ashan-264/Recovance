-- CreateTable
CREATE TABLE "provider_cache_entries" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "provider_cache_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_cache_entries_user_id_provider_idx" ON "provider_cache_entries"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "provider_cache_entries_user_id_provider_resource_key" ON "provider_cache_entries"("user_id", "provider", "resource");

-- AddForeignKey
ALTER TABLE "provider_cache_entries" ADD CONSTRAINT "provider_cache_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
