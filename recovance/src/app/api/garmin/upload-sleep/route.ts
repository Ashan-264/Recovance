import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface GarminSleepData {
  date: string;
  avg_duration_minutes: number | null;
  avg_bedtime: string | null;
  avg_wake_time: string | null;
  original_date_range: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

function parseDateRange(dateRange: string): Date[] {
  if (dateRange === "--" || !dateRange) {
    return [];
  }

  try {
    const currentYear = new Date().getFullYear();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateRange.includes(" - ")) {
      const [start, end] = dateRange.split(" - ");

      // Check if it contains year info
      if (start.includes(",") || end.includes(",")) {
        // Format: "Dec 26, 2024 - Jan 1, 2025"
        startDate = new Date(start.trim());
        endDate = new Date(end.trim());
      } else {
        // Format: "Jan 30 - Feb 5" or similar
        const startYear = start.includes("Dec") ? currentYear - 1 : currentYear;
        const endYear =
          end.includes("Jan") && start.includes("Dec")
            ? currentYear
            : currentYear;

        startDate = new Date(`${start.trim()}, ${startYear}`);
        endDate = new Date(`${end.trim()}, ${endYear}`);
      }
    } else if (dateRange.includes("-")) {
      // Format: "Aug 7-13"
      const parts = dateRange.split("-");
      if (parts.length === 2) {
        const month = parts[0].trim();
        const startDay = month.split(" ")[1];
        const monthName = month.split(" ")[0];
        const endDay = parts[1].trim();

        startDate = new Date(`${monthName} ${startDay}, ${currentYear}`);
        endDate = new Date(`${monthName} ${endDay}, ${currentYear}`);
      }
    }

    if (
      !startDate ||
      !endDate ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      return [];
    }

    // Generate all dates in the range
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  } catch (error) {
    console.error("Error parsing date range:", dateRange, error);
    return [];
  }
}

function parseDuration(duration: string): number | null {
  if (duration === "--" || !duration) {
    return null;
  }

  try {
    // Parse formats like "6h 34min", "7h 56min"
    const hourMatch = duration.match(/(\d+)h/);
    const minMatch = duration.match(/(\d+)min/);

    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minMatch ? parseInt(minMatch[1]) : 0;

    return hours * 60 + minutes;
  } catch (error) {
    console.error("Error parsing duration:", duration, error);
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

    const processedData: GarminSleepData[] = [];

    csvData.forEach((row: string[]) => {
      const [dateRange, avgDuration, avgBedtime, avgWakeTime] = row;

      const dates = parseDateRange(dateRange);
      const duration_minutes = parseDuration(avgDuration);

      // Create a record for each date in the range
      dates.forEach((date) => {
        processedData.push({
          date: date.toISOString().split("T")[0],
          avg_duration_minutes: duration_minutes,
          avg_bedtime: avgBedtime === "--" ? null : avgBedtime,
          avg_wake_time: avgWakeTime === "--" ? null : avgWakeTime,
          original_date_range: dateRange,
        });
      });
    });

    // Insert data into Supabase
    const { data, error } = await supabase
      .from("garmin_sleep")
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
      message: "Sleep data uploaded successfully",
      records: data?.length || 0,
      data,
    });
  } catch (error) {
    console.error("Error processing sleep data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
