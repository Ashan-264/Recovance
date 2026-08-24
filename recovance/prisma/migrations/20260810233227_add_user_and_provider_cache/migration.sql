-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "is_local" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strava_activities" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "strava_id" BIGINT NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "distance" DOUBLE PRECISION,
    "moving_time" INTEGER,
    "total_elevation_gain" DOUBLE PRECISION,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strava_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oura_daily_records" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oura_daily_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oura_sleep_periods" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "oura_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oura_sleep_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_ranges" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "start" DATE NOT NULL,
    "end" DATE NOT NULL,

    CONSTRAINT "sync_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_user_id_provider_key" ON "connected_accounts"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_provider_provider_account_id_key" ON "connected_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "strava_activities_user_id_start_date_idx" ON "strava_activities"("user_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "strava_activities_user_id_strava_id_key" ON "strava_activities"("user_id", "strava_id");

-- CreateIndex
CREATE INDEX "oura_daily_records_user_id_dataset_day_idx" ON "oura_daily_records"("user_id", "dataset", "day");

-- CreateIndex
CREATE UNIQUE INDEX "oura_daily_records_user_id_dataset_day_key" ON "oura_daily_records"("user_id", "dataset", "day");

-- CreateIndex
CREATE INDEX "oura_sleep_periods_user_id_day_idx" ON "oura_sleep_periods"("user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "oura_sleep_periods_user_id_oura_id_key" ON "oura_sleep_periods"("user_id", "oura_id");

-- CreateIndex
CREATE INDEX "sync_ranges_user_id_dataset_idx" ON "sync_ranges"("user_id", "dataset");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strava_activities" ADD CONSTRAINT "strava_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oura_daily_records" ADD CONSTRAINT "oura_daily_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oura_sleep_periods" ADD CONSTRAINT "oura_sleep_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_ranges" ADD CONSTRAINT "sync_ranges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
