import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface GarminActivity {
  activity_type: string;
  date: string;
  favorite: boolean;
  title: string;
  distance: number | null;
  calories: number | null;
  time_minutes: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  aerobic_te: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  total_ascent: number | null;
  total_descent: number | null;
  training_stress_score: number | null;
  total_strokes: number | null;
  min_temp: number | null;
  decompression: string | null;
  best_lap_time: string | null;
  number_of_laps: number | null;
  max_temp: number | null;
  moving_time_minutes: number | null;
  elapsed_time_minutes: number | null;
  min_elevation: number | null;
  max_elevation: number | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

function parseNumericValue(value: string): number | null {
  if (!value || value === "--" || value === "") {
    return null;
  }

  // Remove commas and parse
  const cleanValue = value.replace(/,/g, "");
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
}

function parseBooleanValue(value: string): boolean {
  return value?.toLowerCase() === "true";
}

function parseDate(dateStr: string): string | null {
  try {
    // Parse format: "2025-02-02 14:48:43"
    const date = new Date(dateStr);
    return date.toISOString();
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
    return null;
  }
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || timeStr === "--") {
    return null;
  }

  try {
    // Parse formats like "01:34:56" (HH:MM:SS) or "01:34" (HH:MM)
    const parts = timeStr.split(":");

    if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 60 + minutes + Math.round(seconds / 60);
    } else if (parts.length === 2) {
      // HH:MM format
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours * 60 + minutes;
    }

    return null;
  } catch (error) {
    console.error("Error parsing time:", timeStr, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { csvData } = await request.json();

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json(
        { error: "Invalid CSV data format" },
        { status: 400 }
      );
    }

    const processedData: GarminActivity[] = csvData
      .map((row: string[]) => {
        const [
          activityType,
          date,
          favorite,
          title,
          distance,
          calories,
          time,
          avgHr,
          maxHr,
          aerobicTe,
          avgSpeed,
          maxSpeed,
          totalAscent,
          totalDescent,
          trainingStressScore,
          totalStrokes,
          minTemp,
          decompression,
          bestLapTime,
          numberOfLaps,
          maxTemp,
          movingTime,
          elapsedTime,
          minElevation,
          maxElevation,
        ] = row;

        return {
          activity_type: activityType,
          date: parseDate(date),
          favorite: parseBooleanValue(favorite),
          title: title || null,
          distance: parseNumericValue(distance),
          calories: parseNumericValue(calories),
          time_minutes: parseTimeToMinutes(time),
          avg_hr: parseNumericValue(avgHr),
          max_hr: parseNumericValue(maxHr),
          aerobic_te: parseNumericValue(aerobicTe),
          avg_speed: parseNumericValue(avgSpeed),
          max_speed: parseNumericValue(maxSpeed),
          total_ascent: parseNumericValue(totalAscent),
          total_descent: parseNumericValue(totalDescent),
          training_stress_score: parseNumericValue(trainingStressScore),
          total_strokes: parseNumericValue(totalStrokes),
          min_temp: parseNumericValue(minTemp),
          decompression: decompression === "--" ? null : decompression,
          best_lap_time: bestLapTime === "--" ? null : bestLapTime,
          number_of_laps: parseNumericValue(numberOfLaps),
          max_temp: parseNumericValue(maxTemp),
          moving_time_minutes: parseTimeToMinutes(movingTime),
          elapsed_time_minutes: parseTimeToMinutes(elapsedTime),
          min_elevation: parseNumericValue(minElevation),
          max_elevation: parseNumericValue(maxElevation),
        };
      })
      .filter((activity) => activity.date !== null); // Filter out invalid dates

    // Insert data into Supabase
    const { data, error } = await supabase
      .from("garmin_activity")
      .insert(processedData)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to insert data into database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Activity data uploaded successfully",
      records: data?.length || 0,
      data,
    });
  } catch (error) {
    console.error("Error processing activity data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
