-- Garmin Sleep Data Table
CREATE TABLE IF NOT EXISTS garmin_sleep (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  avg_duration_minutes INTEGER,
  avg_bedtime TEXT,
  avg_wake_time TEXT,
  original_date_range TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garmin Activities Table
CREATE TABLE IF NOT EXISTS garmin_activity (
  id BIGSERIAL PRIMARY KEY,
  activity_type TEXT NOT NULL,
  date TIMESTAMPTZ,
  favorite BOOLEAN DEFAULT FALSE,
  title TEXT,
  distance DECIMAL,
  calories INTEGER,
  time_minutes INTEGER,
  avg_hr INTEGER,
  max_hr INTEGER,
  aerobic_te DECIMAL,
  avg_speed DECIMAL,
  max_speed DECIMAL,
  total_ascent INTEGER,
  total_descent INTEGER,
  training_stress_score DECIMAL,
  total_strokes INTEGER,
  min_temp DECIMAL,
  decompression TEXT,
  best_lap_time TEXT,
  number_of_laps INTEGER,
  max_temp DECIMAL,
  moving_time_minutes INTEGER,
  elapsed_time_minutes INTEGER,
  min_elevation INTEGER,
  max_elevation INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_garmin_sleep_date ON garmin_sleep(date);
CREATE INDEX IF NOT EXISTS idx_garmin_activity_date ON garmin_activity(date);
CREATE INDEX IF NOT EXISTS idx_garmin_activity_type ON garmin_activity(activity_type);

-- Create RLS (Row Level Security) policies if needed
ALTER TABLE garmin_sleep ENABLE ROW LEVEL SECURITY;
ALTER TABLE garmin_activity ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your authentication setup)
-- These policies allow all operations for now - customize based on your needs
CREATE POLICY "Enable all operations for garmin_sleep" ON garmin_sleep
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for garmin_activity" ON garmin_activity
  FOR ALL USING (true);

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_garmin_sleep_updated_at
  BEFORE UPDATE ON garmin_sleep
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_garmin_activity_updated_at
  BEFORE UPDATE ON garmin_activity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
