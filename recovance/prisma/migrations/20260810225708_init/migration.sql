-- CreateTable
CREATE TABLE "garmin_sleep" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "avg_duration_minutes" INTEGER,
    "avg_bedtime" TEXT,
    "avg_wake_time" TEXT,
    "original_date_range" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "garmin_sleep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garmin_activity" (
    "id" BIGSERIAL NOT NULL,
    "activity_type" TEXT NOT NULL,
    "date" TIMESTAMPTZ(6),
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "distance" DECIMAL(12,3),
    "calories" INTEGER,
    "time_minutes" INTEGER,
    "avg_hr" INTEGER,
    "max_hr" INTEGER,
    "aerobic_te" DECIMAL(6,2),
    "avg_speed" DECIMAL(10,3),
    "max_speed" DECIMAL(10,3),
    "total_ascent" INTEGER,
    "total_descent" INTEGER,
    "training_stress_score" DECIMAL(10,2),
    "total_strokes" INTEGER,
    "min_temp" DECIMAL(6,2),
    "decompression" TEXT,
    "best_lap_time" TEXT,
    "number_of_laps" INTEGER,
    "max_temp" DECIMAL(6,2),
    "moving_time_minutes" INTEGER,
    "elapsed_time_minutes" INTEGER,
    "min_elevation" INTEGER,
    "max_elevation" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "garmin_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garmin_sleep_date_key" ON "garmin_sleep"("date");

-- CreateIndex
CREATE INDEX "garmin_sleep_date_idx" ON "garmin_sleep"("date");

-- CreateIndex
CREATE INDEX "garmin_activity_date_idx" ON "garmin_activity"("date");

-- CreateIndex
CREATE INDEX "garmin_activity_activity_type_idx" ON "garmin_activity"("activity_type");

-- CreateIndex
CREATE UNIQUE INDEX "garmin_activity_date_activity_type_key" ON "garmin_activity"("date", "activity_type");
