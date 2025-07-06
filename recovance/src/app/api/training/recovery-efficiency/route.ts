import { NextRequest, NextResponse } from "next/server";

interface RecoveryEfficiencyRequest {
  start_date: string;
  end_date: string;
  access_token: string;
}

interface StravaActivity {
  id: number;
  start_date: string;
  distance?: number;
  total_elevation_gain?: number;
  description?: string;
  suffer_score?: number;
  moving_time?: number;
  type?: string;
  relative_effort?: number;
}

interface OuraReadinessData {
  day: string;
  score?: number;
  contributors?: {
    hrv_balance?: number;
    activity_balance?: number;
    resting_heart_rate?: number;
    previous_day_activity?: number;
    previous_night?: number;
    recovery_index?: number;
    sleep_balance?: number;
    body_temperature?: number;
  };
  temperature_deviation?: number;
  temperature_trend_deviation?: number;
  timestamp?: string;
}

interface OuraSleepData {
  day: string;
  average_hrv?: number;
  average_heart_rate?: number;
  total_sleep_duration?: number;
  sleep_score?: number;
}

interface RestDay {
  date: string;
  hrv_today: number;
  hrv_yesterday: number;
  hrv_improvement: number;
  sleep_duration: number;
  sleep_score: number;
  activity_score: number;
  recovery_efficiency: number;
  is_verified_rest: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { start_date, end_date, access_token }: RecoveryEfficiencyRequest =
      await req.json();

    console.log("=== RECOVERY EFFICIENCY DEBUG ===");
    console.log(`Request: start_date=${start_date}, end_date=${end_date}`);

    if (!start_date || !end_date || !access_token) {
      console.log("Missing required parameters");
      return NextResponse.json(
        {
          error:
            "Missing required parameters: start_date, end_date, access_token",
        },
        { status: 400 }
      );
    }

    // Fetch Strava activities for the date range
    const startTimestamp = Math.floor(new Date(start_date).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(end_date).getTime() / 1000);

    console.log(
      `Fetching Strava activities from ${startTimestamp} to ${endTimestamp}`
    );

    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${startTimestamp}&before=${endTimestamp}&per_page=200`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text();
      console.log(
        `Strava API error: ${activitiesResponse.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: `Strava API error: ${errorText}` },
        { status: activitiesResponse.status }
      );
    }

    const activities: StravaActivity[] = await activitiesResponse.json();
    console.log(`✅ Fetched ${activities.length} Strava activities`);

    // Debug: Show sample activity descriptions to identify Coros training load patterns
    if (activities.length > 0) {
      console.log(`\n=== SAMPLE ACTIVITY DESCRIPTIONS ===`);
      activities.slice(0, 3).forEach((activity, index) => {
        console.log(
          `Activity ${index + 1}: ${activity.type} - ${activity.start_date}`
        );
        console.log(
          `Description: "${activity.description || "No description"}"`
        );
        console.log(`Suffer Score: ${activity.suffer_score || "None"}`);
        console.log(`Relative Effort: ${activity.relative_effort || "None"}`);
        console.log(
          `Duration: ${
            activity.moving_time ? Math.round(activity.moving_time / 60) : 0
          }min`
        );
        console.log("---");
      });
    }

    if (activities.length > 0) {
      console.log(
        `Sample activity: ${activities[0].start_date} - ${activities[0].type} - ${activities[0].moving_time}s`
      );
    }

    // Fetch Oura readiness data
    const ouraToken = process.env.OURA_API_TOKEN;
    let readinessData: OuraReadinessData[] = [];
    let sleepData: OuraSleepData[] = [];

    if (!ouraToken) {
      console.log("❌ No Oura API token found in environment variables");
    } else {
      console.log("✅ Oura API token found, fetching data...");

      // Fetch readiness data
      const readinessUrl = `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start_date}&end_date=${end_date}`;
      console.log(`Fetching readiness data from: ${readinessUrl}`);

      const readinessResponse = await fetch(readinessUrl, {
        headers: { Authorization: `Bearer ${ouraToken}` },
      });

      if (readinessResponse.ok) {
        const readinessResult = await readinessResponse.json();
        readinessData = readinessResult.data || [];
        console.log(`✅ Fetched ${readinessData.length} readiness records`);

        if (readinessData.length > 0) {
          // Map the correct fields from Oura API
          const sample = readinessData[0];
          const hrvBalance = sample.contributors?.hrv_balance;
          const activityBalance = sample.contributors?.activity_balance;
          const restingHeartRate = sample.contributors?.resting_heart_rate;

          console.log(
            `Sample readiness: ${sample.day} - HRV Balance: ${hrvBalance} - Activity Balance: ${activityBalance} - RHR: ${restingHeartRate}`
          );
          console.log(
            `Full readiness record structure:`,
            JSON.stringify(sample, null, 2)
          );
        }
      } else {
        console.log(`❌ Oura readiness API error: ${readinessResponse.status}`);
        const errorText = await readinessResponse.text();
        console.log(`Error details: ${errorText}`);
      }

      // Fetch sleep data
      const sleepUrl = `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start_date}&end_date=${end_date}`;
      console.log(`Fetching sleep data from: ${sleepUrl}`);

      const sleepResponse = await fetch(sleepUrl, {
        headers: { Authorization: `Bearer ${ouraToken}` },
      });

      if (sleepResponse.ok) {
        const sleepResult = await sleepResponse.json();
        const sleepRecords = sleepResult.data || [];
        sleepData = sleepRecords.map((record: OuraSleepData) => ({
          day: record.day,
          average_hrv: record.average_hrv,
          average_heart_rate: record.average_heart_rate,
          total_sleep_duration: record.total_sleep_duration,
          sleep_score: record.sleep_score,
        }));
        console.log(`✅ Fetched ${sleepData.length} sleep records`);

        if (sleepData.length > 0) {
          const sample = sleepData[0];
          console.log(
            `Sample sleep: ${sample.day} - Duration: ${sample.total_sleep_duration}s - HRV: ${sample.average_hrv} - Score: ${sample.sleep_score}`
          );
          console.log(
            `Full sleep record structure:`,
            JSON.stringify(sample, null, 2)
          );
        }
      } else {
        console.log(`❌ Oura sleep API error: ${sleepResponse.status}`);
        const errorText = await sleepResponse.text();
        console.log(`Error details: ${errorText}`);
      }
    }

    // Find rest days and calculate recovery efficiency
    const restDays: RestDay[] = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    console.log(`\n=== ANALYZING RECOVERY EFFICIENCY ===`);
    console.log(`Date range: ${start_date} to ${end_date}`);
    console.log(`Total activities: ${activities.length}`);
    console.log(`Total readiness records: ${readinessData.length}`);
    console.log(`Total sleep records: ${sleepData.length}`);

    let daysProcessed = 0;
    let daysWithHRV = 0;
    let daysWithLowActivity = 0;

    for (
      let currentDate = new Date(startDate);
      currentDate <= endDate;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      const dateStr = currentDate.toISOString().split("T")[0];
      daysProcessed++;

      // Get activities for this day
      const dayActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.start_date)
          .toISOString()
          .split("T")[0];
        return activityDate === dateStr;
      });

      // Get readiness data for this day
      const dayReadiness = readinessData.find(
        (record) => record.day === dateStr
      );

      // Get sleep data for this day
      const daySleep = sleepData.find((record) => record.day === dateStr);

      // Get yesterday's HRV for comparison
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const yesterdayReadiness = readinessData.find(
        (record) => record.day === yesterdayStr
      );

      // More flexible rest day detection
      const hasLowActivity =
        dayActivities.length === 0 ||
        (dayReadiness?.contributors?.activity_balance &&
          dayReadiness.contributors.activity_balance < 30);

      const hasHRVData =
        dayReadiness?.contributors?.hrv_balance &&
        yesterdayReadiness?.contributors?.hrv_balance;

      if (hasHRVData) daysWithHRV++;
      if (hasLowActivity) daysWithLowActivity++;

      // Consider it a rest day if there's low activity and we have HRV data
      if (hasLowActivity && hasHRVData) {
        const hrvToday = dayReadiness!.contributors!.hrv_balance!;
        const hrvYesterday = yesterdayReadiness!.contributors!.hrv_balance!;
        const hrvImprovement = hrvToday - hrvYesterday;

        const sleepDuration = daySleep?.total_sleep_duration
          ? daySleep.total_sleep_duration / 3600
          : 0;
        const sleepScore = dayReadiness?.score || 0;
        const activityScore = dayReadiness?.contributors?.activity_balance || 0;

        // Calculate recovery efficiency
        const recoveryEfficiency = calculateRecoveryEfficiency(
          hrvImprovement,
          sleepDuration,
          sleepScore,
          activityScore
        );

        // More flexible verification - consider it verified if very low activity
        const isVerifiedRest =
          dayActivities.length === 0 ||
          (activityScore < 20 && dayActivities.length <= 1);

        restDays.push({
          date: dateStr,
          hrv_today: hrvToday,
          hrv_yesterday: hrvYesterday,
          hrv_improvement: hrvImprovement,
          sleep_duration: sleepDuration,
          sleep_score: sleepScore,
          activity_score: activityScore,
          recovery_efficiency: recoveryEfficiency,
          is_verified_rest: isVerifiedRest,
        });

        console.log(
          `✅ Rest day found: ${dateStr}, efficiency: ${recoveryEfficiency}, verified: ${isVerifiedRest}, HRV: ${hrvToday}→${hrvYesterday} (${
            hrvImprovement > 0 ? "+" : ""
          }${hrvImprovement})`
        );
      } else if (hasLowActivity && !hasHRVData) {
        // Alternative: Calculate efficiency without HRV if we have sleep data
        const sleepDuration = daySleep?.total_sleep_duration
          ? daySleep.total_sleep_duration / 3600
          : 0;
        const sleepScore = dayReadiness?.score || 0;
        const activityScore = dayReadiness?.contributors?.activity_balance || 0;

        // Only proceed if we have meaningful sleep data
        if (sleepDuration > 0 || sleepScore > 0) {
          // Calculate efficiency without HRV (use 0 for HRV improvement)
          const recoveryEfficiency = calculateRecoveryEfficiencyWithoutHRV(
            sleepDuration,
            sleepScore,
            activityScore
          );

          // More flexible verification - consider it verified if very low activity
          const isVerifiedRest =
            dayActivities.length === 0 ||
            (activityScore < 20 && dayActivities.length <= 1);

          restDays.push({
            date: dateStr,
            hrv_today: 0,
            hrv_yesterday: 0,
            hrv_improvement: 0,
            sleep_duration: sleepDuration,
            sleep_score: sleepScore,
            activity_score: activityScore,
            recovery_efficiency: recoveryEfficiency,
            is_verified_rest: isVerifiedRest,
          });

          console.log(
            `⚠️ Rest day found (no HRV): ${dateStr}, efficiency: ${recoveryEfficiency}, verified: ${isVerifiedRest}, Sleep: ${sleepDuration}h, Score: ${sleepScore}`
          );
        }
      } else if (daysProcessed <= 5) {
        // Log first few days for debugging
        console.log(
          `❌ Day ${dateStr}: activities=${dayActivities.length}, HRV=${
            dayReadiness?.contributors?.hrv_balance || "none"
          }, activity_score=${
            dayReadiness?.contributors?.activity_balance || "none"
          }`
        );
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Days processed: ${daysProcessed}`);
    console.log(`Days with HRV data: ${daysWithHRV}`);
    console.log(`Days with low activity: ${daysWithLowActivity}`);
    console.log(`Total rest days found: ${restDays.length}`);
    console.log(
      `Verified rest days: ${
        restDays.filter((day) => day.is_verified_rest).length
      }`
    );

    // Calculate summary
    const validRestDays = restDays.filter((day) => day.is_verified_rest);
    const averageEfficiency =
      validRestDays.length > 0
        ? validRestDays.reduce((sum, day) => sum + day.recovery_efficiency, 0) /
          validRestDays.length
        : 0;

    const bestRestDay =
      validRestDays.length > 0
        ? validRestDays.reduce((best, current) =>
            current.recovery_efficiency > best.recovery_efficiency
              ? current
              : best
          ).date
        : "";

    const worstRestDay =
      validRestDays.length > 0
        ? validRestDays.reduce((worst, current) =>
            current.recovery_efficiency < worst.recovery_efficiency
              ? current
              : worst
          ).date
        : "";

    // Determine efficiency trend
    const efficiencyTrend = determineEfficiencyTrend(validRestDays);

    const response = {
      rest_days: restDays,
      summary: {
        total_rest_days: validRestDays.length,
        average_efficiency: Math.round(averageEfficiency * 100) / 100,
        best_rest_day: bestRestDay,
        worst_rest_day: worstRestDay,
        efficiency_trend: efficiencyTrend,
      },
    };

    console.log(`\n=== RESPONSE ===`);
    console.log(`Response summary:`, response.summary);
    console.log(`Total rest days in response: ${response.rest_days.length}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error calculating recovery efficiency:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateRecoveryEfficiency(
  hrvImprovement: number,
  sleepDuration: number,
  sleepScore: number,
  activityScore: number
): number {
  let efficiency = 0;
  let factors = 0;

  // HRV improvement factor (positive improvement is good)
  if (hrvImprovement > 0) {
    // Normalize HRV improvement: 0-20ms range, higher is better
    const hrvFactor = Math.min(hrvImprovement / 20, 1) * 100;
    efficiency += hrvFactor;
    factors++;
  } else {
    // Negative HRV change reduces efficiency
    const hrvFactor = Math.max(hrvImprovement / 10, -50);
    efficiency += hrvFactor;
    factors++;
  }

  // Sleep duration factor (7-9 hours is optimal)
  if (sleepDuration > 0) {
    let sleepFactor = 0;
    if (sleepDuration >= 7 && sleepDuration <= 9) sleepFactor = 100;
    else if (sleepDuration >= 6 && sleepDuration <= 10) sleepFactor = 70;
    else if (sleepDuration >= 5 && sleepDuration <= 11) sleepFactor = 40;
    else sleepFactor = 20;

    efficiency += sleepFactor;
    factors++;
  }

  // Sleep score factor
  if (sleepScore > 0) {
    efficiency += sleepScore;
    factors++;
  }

  // Activity score factor (lower is better for rest days)
  if (activityScore >= 0) {
    const activityFactor = Math.max(100 - activityScore, 0);
    efficiency += activityFactor;
    factors++;
  }

  // Calculate average if we have factors
  if (factors > 0) {
    efficiency = efficiency / factors;
  }

  // Ensure efficiency is within 0-100 range
  return Math.max(0, Math.min(100, Math.round(efficiency * 100) / 100));
}

function calculateRecoveryEfficiencyWithoutHRV(
  sleepDuration: number,
  sleepScore: number,
  activityScore: number
): number {
  let efficiency = 0;
  let factors = 0;

  // Sleep duration factor (7-9 hours is optimal)
  if (sleepDuration > 0) {
    let sleepFactor = 0;
    if (sleepDuration >= 7 && sleepDuration <= 9) sleepFactor = 100;
    else if (sleepDuration >= 6 && sleepDuration <= 10) sleepFactor = 70;
    else if (sleepDuration >= 5 && sleepDuration <= 11) sleepFactor = 40;
    else sleepFactor = 20;

    efficiency += sleepFactor;
    factors++;
  }

  // Sleep score factor
  if (sleepScore > 0) {
    efficiency += sleepScore;
    factors++;
  }

  // Activity score factor (lower is better for rest days)
  if (activityScore >= 0) {
    const activityFactor = Math.max(100 - activityScore, 0);
    efficiency += activityFactor;
    factors++;
  }

  // Calculate average if we have factors
  if (factors > 0) {
    efficiency = efficiency / factors;
  }

  // Ensure efficiency is within 0-100 range
  return Math.max(0, Math.min(100, Math.round(efficiency * 100) / 100));
}

function determineEfficiencyTrend(
  restDays: RestDay[]
): "improving" | "declining" | "stable" {
  if (restDays.length < 3) return "stable";

  // Sort by date
  const sortedDays = restDays.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate trend using linear regression
  const n = sortedDays.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = sortedDays.map((day) => day.recovery_efficiency);

  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  if (slope > 2) return "improving";
  if (slope < -2) return "declining";
  return "stable";
}
