import { NextRequest, NextResponse } from "next/server";

interface MismatchRequest {
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

interface WeeklyMismatch {
  week_start: string;
  week_end: string;
  training_load_score: number;
  recovery_score: number;
  mismatch_severity: "high" | "moderate" | "low";
  activities: StravaActivity[];
  readiness_data: OuraReadinessData[];
  sleep_data: OuraSleepData[];
  total_activities: number;
  total_duration: number; // in minutes
  recommendations: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { start_date, end_date, access_token }: MismatchRequest =
      await req.json();

    console.log("=== STRAIN-RECOVERY MISMATCH DEBUG ===");
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
          const sample = readinessData[0];
          const hrvBalance = sample.contributors?.hrv_balance;
          const activityBalance = sample.contributors?.activity_balance;
          console.log(
            `Sample readiness: ${sample.day} - HRV Balance: ${hrvBalance} - Activity Balance: ${activityBalance}`
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
          console.log(
            `Sample sleep: ${sleepData[0].day} - Duration: ${sleepData[0].total_sleep_duration}s - Score: ${sleepData[0].sleep_score}`
          );
        }
      } else {
        console.log(`❌ Oura sleep API error: ${sleepResponse.status}`);
        const errorText = await sleepResponse.text();
        console.log(`Error details: ${errorText}`);
      }
    }

    // Find weekly mismatches
    const weeklyMismatches: WeeklyMismatch[] = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    console.log(`\n=== ANALYZING WEEKLY MISMATCHES ===`);
    console.log(`Date range: ${start_date} to ${end_date}`);
    console.log(`Total activities: ${activities.length}`);
    console.log(`Total readiness records: ${readinessData.length}`);
    console.log(`Total sleep records: ${sleepData.length}`);

    let weeksProcessed = 0;
    let weeksWithActivities = 0;
    let weeksWithRecoveryData = 0;

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
      weeksProcessed++;

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

      if (weekActivities.length > 0) weeksWithActivities++;
      if (weekReadiness.length > 0 || weekSleep.length > 0)
        weeksWithRecoveryData++;

      // Calculate weekly training load score
      const trainingLoadScore =
        calculateWeeklyTrainingLoadScore(weekActivities);

      // Calculate weekly recovery score
      const recoveryScore = calculateWeeklyRecoveryScore(
        weekReadiness,
        weekSleep
      );

      console.log(`Week ${weeksProcessed} (${weekStartStr} to ${weekEndStr}):`);
      console.log(
        `  Activities: ${weekActivities.length}, Load: ${trainingLoadScore}`
      );
      console.log(
        `  Recovery data: ${weekReadiness.length} readiness + ${weekSleep.length} sleep, Score: ${recoveryScore}`
      );

      // Check for mismatch: training_load_score > 70 AND recovery_score < 60
      const mismatch = trainingLoadScore > 70 && recoveryScore < 60;

      if (mismatch) {
        const severity = determineMismatchSeverity(
          trainingLoadScore,
          recoveryScore
        );
        const recommendations = generateWeeklyRecommendations(
          trainingLoadScore,
          recoveryScore,
          weekReadiness,
          weekSleep,
          weekActivities
        );

        // Calculate total duration
        const totalDuration = weekActivities.reduce(
          (sum, activity) =>
            sum + (activity.moving_time ? activity.moving_time / 60 : 0),
          0
        );

        weeklyMismatches.push({
          week_start: weekStartStr,
          week_end: weekEndStr,
          training_load_score: trainingLoadScore,
          recovery_score: recoveryScore,
          mismatch_severity: severity,
          activities: weekActivities,
          readiness_data: weekReadiness,
          sleep_data: weekSleep,
          total_activities: weekActivities.length,
          total_duration: Math.round(totalDuration),
          recommendations,
        });

        console.log(
          `  ❌ MISMATCH DETECTED: ${severity.toUpperCase()} severity`
        );
        console.log(
          `  Gap: ${trainingLoadScore - recoveryScore}, Recommendations: ${
            recommendations.length
          }`
        );
      } else {
        console.log(
          `  ✅ No mismatch (Load: ${trainingLoadScore}, Recovery: ${recoveryScore})`
        );
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Weeks processed: ${weeksProcessed}`);
    console.log(`Weeks with activities: ${weeksWithActivities}`);
    console.log(`Weeks with recovery data: ${weeksWithRecoveryData}`);
    console.log(`Total mismatches found: ${weeklyMismatches.length}`);

    // Calculate summary
    const highSeverityCount = weeklyMismatches.filter(
      (week) => week.mismatch_severity === "high"
    ).length;
    const moderateSeverityCount = weeklyMismatches.filter(
      (week) => week.mismatch_severity === "moderate"
    ).length;
    const lowSeverityCount = weeklyMismatches.filter(
      (week) => week.mismatch_severity === "low"
    ).length;

    const mostCommonIssue = determineMostCommonIssue(weeklyMismatches);

    const response = {
      weekly_mismatches: weeklyMismatches,
      summary: {
        total_mismatches: weeklyMismatches.length,
        high_severity_count: highSeverityCount,
        moderate_severity_count: moderateSeverityCount,
        low_severity_count: lowSeverityCount,
        most_common_issue: mostCommonIssue,
      },
    };

    console.log(`\n=== RESPONSE ===`);
    console.log(`Response summary:`, response.summary);
    console.log(
      `Total mismatches in response: ${response.weekly_mismatches.length}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error detecting mismatches:", error);
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

function determineMismatchSeverity(
  trainingLoad: number,
  recoveryScore: number
): "high" | "moderate" | "low" {
  const gap = trainingLoad - recoveryScore;

  if (gap > 50) return "high";
  if (gap > 30) return "moderate";
  return "low";
}

function generateWeeklyRecommendations(
  trainingLoad: number,
  recoveryScore: number,
  readinessData: OuraReadinessData[],
  sleepData: OuraSleepData[],
  activities: StravaActivity[]
): string[] {
  const recommendations: string[] = [];

  // Training load recommendations
  if (trainingLoad > 90) {
    recommendations.push(
      "Very high weekly training load - consider reducing intensity or volume"
    );
  } else if (trainingLoad > 80) {
    recommendations.push(
      "High weekly training load - ensure adequate recovery time"
    );
  }

  // Recovery recommendations
  if (recoveryScore < 30) {
    recommendations.push("Poor weekly recovery - prioritize rest and sleep");
  } else if (recoveryScore < 50) {
    recommendations.push(
      "Below-average weekly recovery - consider lighter training"
    );
  }

  // Sleep-specific recommendations
  const avgSleepHours =
    sleepData.length > 0
      ? sleepData.reduce(
          (sum, record) =>
            sum +
            (record.total_sleep_duration
              ? record.total_sleep_duration / 3600
              : 0),
          0
        ) / sleepData.length
      : 0;

  if (avgSleepHours > 0) {
    if (avgSleepHours < 6) {
      recommendations.push(
        "Insufficient average sleep duration - aim for 7-9 hours per night"
      );
    } else if (avgSleepHours > 10) {
      recommendations.push(
        "Excessive average sleep - may indicate fatigue or illness"
      );
    }
  }

  // HRV recommendations
  const avgHRV =
    readinessData.length > 0
      ? readinessData.reduce(
          (sum, record) => sum + (record.contributors?.hrv_balance || 0),
          0
        ) / readinessData.length
      : 0;

  if (avgHRV > 0 && avgHRV < 30) {
    recommendations.push(
      "Low average HRV - focus on stress management and recovery"
    );
  }

  // Resting heart rate recommendations
  const avgRHR =
    readinessData.length > 0
      ? readinessData.reduce(
          (sum, record) => sum + (record.contributors?.resting_heart_rate || 0),
          0
        ) / readinessData.length
      : 0;

  if (avgRHR > 0 && avgRHR > 70) {
    recommendations.push(
      "Elevated average resting heart rate - monitor for overtraining signs"
    );
  }

  // Activity frequency recommendations
  if (activities.length > 7) {
    recommendations.push("High activity frequency - consider more rest days");
  } else if (activities.length < 3) {
    recommendations.push(
      "Low activity frequency - may need more consistent training"
    );
  }

  // Default recommendation if no specific issues
  if (recommendations.length === 0) {
    recommendations.push(
      "Consider reducing training load or improving recovery"
    );
  }

  return recommendations;
}

function determineMostCommonIssue(weeklyMismatches: WeeklyMismatch[]): string {
  const issues: { [key: string]: number } = {};

  weeklyMismatches.forEach((week) => {
    week.recommendations.forEach((rec) => {
      if (rec.includes("sleep")) issues.sleep = (issues.sleep || 0) + 1;
      if (rec.includes("HRV")) issues.hrv = (issues.hrv || 0) + 1;
      if (rec.includes("heart rate")) issues.rhr = (issues.rhr || 0) + 1;
      if (rec.includes("training"))
        issues.training = (issues.training || 0) + 1;
      if (rec.includes("activity"))
        issues.activity = (issues.activity || 0) + 1;
    });
  });

  const mostCommon = Object.entries(issues).sort(([, a], [, b]) => b - a)[0];
  return mostCommon ? mostCommon[0] : "general recovery";
}
