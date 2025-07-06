import { NextRequest, NextResponse } from "next/server";

interface AlignmentRequest {
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
  moving_time?: number; // Duration in seconds
  type?: string; // Activity type
  relative_effort?: number; // Strava's relative effort metric
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

interface WeeklyAlignmentScore {
  week_start: string;
  week_end: string;
  training_load_score: number;
  recovery_score: number;
  alignment_score: number;
  activities: StravaActivity[];
  readiness_data: OuraReadinessData[];
  sleep_data: OuraSleepData[];
  total_activities: number;
  total_duration: number; // in minutes
}

export async function POST(req: NextRequest) {
  try {
    const { start_date, end_date, access_token }: AlignmentRequest =
      await req.json();

    if (!start_date || !end_date || !access_token) {
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
      return NextResponse.json(
        { error: `Strava API error: ${errorText}` },
        { status: activitiesResponse.status }
      );
    }

    const activities: StravaActivity[] = await activitiesResponse.json();
    console.log(`Fetched ${activities.length} Strava activities`);

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

    // Fetch Oura readiness data
    const ouraToken = process.env.OURA_API_TOKEN;
    let readinessData: OuraReadinessData[] = [];
    let sleepData: OuraSleepData[] = [];

    if (ouraToken) {
      // Fetch readiness data
      const readinessUrl = `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start_date}&end_date=${end_date}`;
      const readinessResponse = await fetch(readinessUrl, {
        headers: { Authorization: `Bearer ${ouraToken}` },
      });

      if (readinessResponse.ok) {
        const readinessResult = await readinessResponse.json();
        readinessData = readinessResult.data || [];
        console.log(`Fetched ${readinessData.length} readiness records`);
      }

      // Fetch sleep data
      const sleepUrl = `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start_date}&end_date=${end_date}`;
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
        console.log(`Fetched ${sleepData.length} sleep records`);
      }
    }

    // Calculate weekly alignment scores
    const weeklyScores: WeeklyAlignmentScore[] = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Group by weeks
    for (
      let currentDate = new Date(startDate);
      currentDate <= endDate;
      currentDate.setDate(currentDate.getDate() + 7)
    ) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekEnd > endDate) {
        weekEnd.setTime(endDate.getTime());
      }

      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      // Get activities for this week
      const weekActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= weekStart && activityDate <= weekEnd;
      });

      // Get readiness data for this week
      const weekReadiness = readinessData.filter((record) => {
        const recordDate = new Date(record.day);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      // Get sleep data for this week
      const weekSleep = sleepData.filter((record) => {
        const recordDate = new Date(record.day);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      // Calculate weekly training load score
      const trainingLoadScore =
        calculateWeeklyTrainingLoadScore(weekActivities);

      // Calculate weekly recovery score
      const recoveryScore = calculateWeeklyRecoveryScore(
        weekReadiness,
        weekSleep
      );

      // Calculate alignment score (100 minus the absolute difference)
      // Recovery scores below 60% are considered low recovery
      const alignmentScore = 100 - Math.abs(trainingLoadScore - recoveryScore);

      // Calculate total duration
      const totalDuration = weekActivities.reduce(
        (sum, activity) =>
          sum + (activity.moving_time ? activity.moving_time / 60 : 0),
        0
      );

      weeklyScores.push({
        week_start: weekStartStr,
        week_end: weekEndStr,
        training_load_score: trainingLoadScore,
        recovery_score: recoveryScore,
        alignment_score: alignmentScore,
        activities: weekActivities,
        readiness_data: weekReadiness,
        sleep_data: weekSleep,
        total_activities: weekActivities.length,
        total_duration: Math.round(totalDuration),
      });
    }

    // Calculate summary
    const validScores = weeklyScores.filter(
      (score) => score.alignment_score > 0
    );
    const averageAlignment =
      validScores.length > 0
        ? validScores.reduce((sum, score) => sum + score.alignment_score, 0) /
          validScores.length
        : 0;

    const bestWeek =
      validScores.length > 0
        ? validScores.reduce((best, current) =>
            current.alignment_score > best.alignment_score ? current : best
          )
        : null;

    const worstWeek =
      validScores.length > 0
        ? validScores.reduce((worst, current) =>
            current.alignment_score < worst.alignment_score ? current : worst
          )
        : null;

    return NextResponse.json({
      weekly_scores: weeklyScores,
      summary: {
        average_alignment: Math.round(averageAlignment * 100) / 100,
        best_alignment_week: bestWeek
          ? `${bestWeek.week_start} to ${bestWeek.week_end}`
          : "",
        worst_alignment_week: worstWeek
          ? `${worstWeek.week_start} to ${worstWeek.week_end}`
          : "",
        total_weeks: weeklyScores.length,
        total_activities: weeklyScores.reduce(
          (sum, week) => sum + week.total_activities,
          0
        ),
        total_duration: weeklyScores.reduce(
          (sum, week) => sum + week.total_duration,
          0
        ),
      },
    });
  } catch (error) {
    console.error("Error calculating alignment score:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateWeeklyTrainingLoadScore(
  activities: StravaActivity[]
): number {
  if (activities.length === 0) return 0;

  let totalLoad = 0;
  let corosLoadCount = 0;
  let stravaLoadCount = 0;
  let customLoadCount = 0;

  console.log(`\n=== CALCULATING WEEKLY TRAINING LOAD ===`);
  console.log(`Processing ${activities.length} activities`);

  for (const activity of activities) {
    let activityLoad = 0;
    let loadSource = "unknown";

    // Priority 1: Try to extract Coros Training Load from description
    if (activity.description) {
      // Try multiple patterns for Coros training load
      const patterns = [
        /Training Load:?\s*(\d+)/i,
        /TL:?\s*(\d+)/i,
        /Load:?\s*(\d+)/i,
        /Training:?\s*(\d+)/i,
        /Coros Load:?\s*(\d+)/i,
      ];

      for (const pattern of patterns) {
        const match = activity.description.match(pattern);
        if (match) {
          activityLoad = parseInt(match[1]);
          loadSource = "coros";
          corosLoadCount++;
          console.log(
            `✅ Coros Training Load: ${activityLoad} from "${activity.description.substring(
              0,
              50
            )}..."`
          );
          break;
        }
      }
    }

    // Priority 2: Use Strava's Relative Effort if available
    if (activityLoad === 0 && activity.relative_effort) {
      activityLoad = activity.relative_effort;
      loadSource = "strava";
      stravaLoadCount++;
      console.log(
        `✅ Strava Relative Effort: ${activityLoad} for ${activity.type}`
      );
    }

    // Priority 3: Custom RPE calculation (fallback)
    if (activityLoad === 0) {
      // Estimate RPE based on activity type and suffer score
      let rpe = 5; // Default moderate RPE

      if (activity.suffer_score) {
        // Map suffer score to RPE (1-10 scale)
        if (activity.suffer_score < 20) rpe = 3;
        else if (activity.suffer_score < 50) rpe = 5;
        else if (activity.suffer_score < 100) rpe = 7;
        else rpe = 9;
      } else if (activity.type) {
        // Estimate RPE based on activity type
        const type = activity.type.toLowerCase();
        if (type.includes("easy") || type.includes("recovery")) rpe = 3;
        else if (type.includes("tempo") || type.includes("threshold")) rpe = 7;
        else if (type.includes("interval") || type.includes("sprint")) rpe = 9;
        else if (type.includes("long") || type.includes("endurance")) rpe = 6;
      }

      // Duration in minutes
      const durationMinutes = activity.moving_time
        ? activity.moving_time / 60
        : 30;

      // Calculate load: RPE × duration
      activityLoad = rpe * durationMinutes;
      loadSource = "custom";
      customLoadCount++;
      console.log(
        `⚠️ Custom RPE: ${rpe} × ${durationMinutes}min = ${activityLoad} for ${activity.type}`
      );
    }

    totalLoad += activityLoad;
    console.log(
      `📊 Activity Load: ${activityLoad} (${loadSource}) - ${activity.type} - ${
        activity.moving_time ? Math.round(activity.moving_time / 60) : 0
      }min`
    );
  }

  // Normalize to 0-100 scale for weekly load
  // Assuming 100 = very high weekly load (RPE 9 × 60 minutes × 7 days = 3780)
  const normalizedLoad = Math.min((totalLoad / 3780) * 100, 100);

  console.log(`\n=== TRAINING LOAD SUMMARY ===`);
  console.log(`Total raw load: ${totalLoad}`);
  console.log(`Normalized load: ${normalizedLoad}`);
  console.log(
    `Load sources: Coros=${corosLoadCount}, Strava=${stravaLoadCount}, Custom=${customLoadCount}`
  );

  return Math.round(normalizedLoad * 100) / 100;
}

function calculateWeeklyRecoveryScore(
  readinessData: OuraReadinessData[],
  sleepData: OuraSleepData[]
): number {
  if (readinessData.length === 0 && sleepData.length === 0) return 50;

  let totalScore = 0;
  let totalFactors = 0;

  // Calculate average HRV for the week
  const hrvValues = readinessData
    .map((record) => record.contributors?.hrv_balance)
    .filter((hrv): hrv is number => hrv !== undefined && hrv > 0);

  if (hrvValues.length > 0) {
    const avgHRV =
      hrvValues.reduce((sum, hrv) => sum + hrv, 0) / hrvValues.length;
    const hrvScore = Math.min(Math.max((avgHRV - 20) / 80, 0), 1) * 100;
    totalScore += hrvScore;
    totalFactors++;
  }

  // Calculate average resting heart rate for the week
  const rhrValues = readinessData
    .map((record) => record.contributors?.resting_heart_rate)
    .filter((rhr): rhr is number => rhr !== undefined && rhr > 0);

  if (rhrValues.length > 0) {
    const avgRHR =
      rhrValues.reduce((sum, rhr) => sum + rhr, 0) / rhrValues.length;
    const rhrScore = Math.min(Math.max((80 - avgRHR) / 40, 0), 1) * 100;
    totalScore += rhrScore;
    totalFactors++;
  }

  // Calculate average sleep score for the week
  const sleepScores = readinessData
    .map((record) => record.score)
    .filter((score): score is number => score !== undefined && score > 0);

  if (sleepScores.length > 0) {
    const avgSleepScore =
      sleepScores.reduce((sum, score) => sum + score, 0) / sleepScores.length;
    totalScore += avgSleepScore;
    totalFactors++;
  }

  // Calculate average sleep duration for the week
  const sleepDurations = sleepData
    .map((record) =>
      record.total_sleep_duration ? record.total_sleep_duration / 3600 : 0
    )
    .filter((duration) => duration > 0);

  if (sleepDurations.length > 0) {
    const avgSleepHours =
      sleepDurations.reduce((sum, duration) => sum + duration, 0) /
      sleepDurations.length;
    let sleepDurationScore = 0;
    if (avgSleepHours >= 7 && avgSleepHours <= 9) sleepDurationScore = 100;
    else if (avgSleepHours >= 6 && avgSleepHours <= 10) sleepDurationScore = 70;
    else if (avgSleepHours >= 5 && avgSleepHours <= 11) sleepDurationScore = 40;
    else sleepDurationScore = 20;

    totalScore += sleepDurationScore;
    totalFactors++;
  }

  // Calculate average readiness score for the week
  const readinessScores = readinessData
    .map((record) => record.score)
    .filter((score): score is number => score !== undefined && score > 0);

  if (readinessScores.length > 0) {
    const avgReadinessScore =
      readinessScores.reduce((sum, score) => sum + score, 0) /
      readinessScores.length;
    totalScore += avgReadinessScore;
    totalFactors++;
  }

  // Calculate average if we have factors
  if (totalFactors > 0) {
    return Math.round((totalScore / totalFactors) * 100) / 100;
  }

  return 50; // Default neutral score
}
