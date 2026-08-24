-- CreateTable
CREATE TABLE "strava_streams" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "strava_id" BIGINT NOT NULL,
    "payload" JSONB NOT NULL,
    "point_count" INTEGER NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strava_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_metrics" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "strava_id" BIGINT NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "type" TEXT NOT NULL,
    "session_type" TEXT,
    "streams_available" BOOLEAN NOT NULL DEFAULT false,
    "has_heartrate" BOOLEAN NOT NULL DEFAULT false,
    "metrics" JSONB NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_daily" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "values" JSONB NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strava_streams_user_id_idx" ON "strava_streams"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "strava_streams_user_id_strava_id_key" ON "strava_streams"("user_id", "strava_id");

-- CreateIndex
CREATE INDEX "activity_metrics_user_id_start_date_idx" ON "activity_metrics"("user_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "activity_metrics_user_id_strava_id_key" ON "activity_metrics"("user_id", "strava_id");

-- CreateIndex
CREATE INDEX "metric_daily_user_id_day_idx" ON "metric_daily"("user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "metric_daily_user_id_day_key" ON "metric_daily"("user_id", "day");

-- AddForeignKey
ALTER TABLE "strava_streams" ADD CONSTRAINT "strava_streams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_metrics" ADD CONSTRAINT "activity_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_daily" ADD CONSTRAINT "metric_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
