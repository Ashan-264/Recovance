import { NextRequest, NextResponse } from "next/server";

interface BurnoutCalculationRequest {
  start_date: string;
  end_date: string;
  access_token?: string;
  weights?: {
    hrv?: number;
    rhr?: number;
    sleep?: number;
    subjective?: number;
    readiness?: number;
    stress?: number;
    resilience?: number;
  };
}

interface BurnoutScore {
  total_score: number;
  breakdown: {
    hrv_drop_score: number;
    resting_hr_score: number;
    sleep_score: number;
    active_calories_score: number;
    readiness_score?: number;
    stress_score?: number;
    resilience_score?: number;
  };
  weights: {
    hrv: number;
    rhr: number;
    sleep: number;
    subjective: number;
    readiness?: number;
    stress?: number;
    resilience?: number;
  };
  week_start: string;
  week_end: string;
}

interface StravaActivity {
  id: number;
  start_date: string;
  distance?: number;
  total_elevation_gain?: number;
  description?: string;
  suffer_score?: number;
  calories?: number;
  kilojoules?: number;
}

interface OuraSleepData {
  day: string;
  average_hrv?: number;
  average_heart_rate?: number;
  total_sleep_duration?: number;
  score?: number;
}
interface OuraReadinessData {
  day: string;
  score?: number;
}

interface OuraDailyActivityData {
  day: string;
  active_calories?: number;
  total_calories?: number;
}

interface OuraResilienceData {
  day: string;
  contributors?: {
    sleep_recovery?: number;
    daytime_recovery?: number;
    stress?: number;
  };
  level?: string;
}

interface OuraStressData {
  day: string;
  stress_high?: number;
  recovery_high?: number;
  day_summary?: string;
}

// Interface for the actual sleep endpoint data
interface OuraSleepRecord {
  day: string;
  average_hrv?: number;
  average_heart_rate?: number;
  total_sleep_duration?: number;
  deep_sleep_duration?: number;
  rem_sleep_duration?: number;
  light_sleep_duration?: number;
  time_in_bed?: number;
  efficiency?: number;
  latency?: number;
}

export async function POST(req: NextRequest) {
  try {
    const {
      start_date,
      end_date,
      access_token,
      weights,
    }: BurnoutCalculationRequest = await req.json();

    if (!start_date || !end_date) {
      return NextResponse.json(
        {
          error: "Missing required parameters: start_date, end_date",
        },
        { status: 400 }
      );
    }

    // Default weights if not provided
    const defaultWeights = {
      hrv: 0.2,
      rhr: 0.15,
      sleep: 0.2,
      subjective: 0.1,
      readiness: 0.1,
      stress: 0.15,
      resilience: 0.1,
    };

    const finalWeights = { ...defaultWeights, ...weights };

    // Fetch Strava activities for the date range
    // Strava dependency removed. Keep an empty activities array for compatibility with older code.
    const activities: StravaActivity[] = [];

    // Fetch Oura sleep data for the same period
    const ouraToken = process.env.OURA_API_TOKEN;
    let sleepData: OuraSleepData[] = [];
    let dailyActivityData: OuraDailyActivityData[] = [];
    let readinessData: OuraReadinessData[] = [];
    let stressData: OuraStressData[] = [];
    let resilienceData: OuraResilienceData[] = [];

    if (ouraToken) {
      // Use correct Oura API v2 endpoints
      const dailySleepUrl = `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${start_date}&end_date=${end_date}`;
      const sleepUrl = `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start_date}&end_date=${end_date}`;
      const readinessUrl = `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start_date}&end_date=${end_date}`;
      const dailyActivityUrl = `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start_date}&end_date=${end_date}`;
      const stressUrl = `https://api.ouraring.com/v2/usercollection/daily_stress?start_date=${start_date}&end_date=${end_date}`;
      const resilienceUrl = `https://api.ouraring.com/v2/usercollection/daily_resilience?start_date=${start_date}&end_date=${end_date}`;

      console.log(`Fetching Oura daily sleep from: ${dailySleepUrl}`);
      console.log(`Fetching Oura sleep from: ${sleepUrl}`);
      console.log(`Fetching Oura readiness from: ${readinessUrl}`);
      console.log(`Fetching Oura daily activity from: ${dailyActivityUrl}`);

      // Fetch daily sleep data
      const dailySleepResponse = await fetch(dailySleepUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ouraToken}`,
        },
      });

      // Fetch detailed sleep data
      const sleepResponse = await fetch(sleepUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ouraToken}`,
        },
      });

      // Fetch readiness data
      const readinessResponse = await fetch(readinessUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ouraToken}`,
        },
      });

      // Fetch daily activity data
      const dailyActivityResponse = await fetch(dailyActivityUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ouraToken}`,
        },
      });

      // Fetch stress data
      const stressResponse = await fetch(stressUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ouraToken}`,
        },
      });

      // Fetch resilience data
      const resilienceResponse = await fetch(resilienceUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ouraToken}`,
        },
      });

      // Log response statuses
      console.log(`Daily sleep response status: ${dailySleepResponse.status}`);
      console.log(`Sleep response status: ${sleepResponse.status}`);
      console.log(`Readiness response status: ${readinessResponse.status}`);
      console.log(
        `Daily activity response status: ${dailyActivityResponse.status}`
      );
      console.log(`Stress response status: ${stressResponse.status}`);
      console.log(`Resilience response status: ${resilienceResponse.status}`);

      // Process daily sleep data - READ BODY ONLY ONCE
      if (dailySleepResponse.ok) {
        const dailySleepResult = await dailySleepResponse.json();
        const dailySleepRecords = dailySleepResult.data || [];
        console.log(`Fetched ${dailySleepRecords.length} daily sleep records`);

        // Log sample record to see actual field names
        if (dailySleepRecords.length > 0) {
          console.log(
            "Sample daily sleep record:",
            JSON.stringify(dailySleepRecords[0], null, 2)
          );
        }
      } else {
        const errorText = await dailySleepResponse.text();
        console.error("Oura daily sleep API error:", errorText);
      }

      // Process detailed sleep data - READ BODY ONLY ONCE
      if (sleepResponse.ok) {
        const sleepResult = await sleepResponse.json();
        const sleepRecords = sleepResult.data || [];
        console.log(`Fetched ${sleepRecords.length} sleep records`);

        // Log sample record to see actual field names
        if (sleepRecords.length > 0) {
          console.log(
            "Sample sleep record:",
            JSON.stringify(sleepRecords[0], null, 2)
          );
        }

        // Process the data using the sleep records - THIS IS WHERE THE REAL DATA IS
        sleepData = sleepRecords.map((record: OuraSleepRecord) => ({
          day: record.day,
          average_hrv: record.average_hrv,
          average_heart_rate: record.average_heart_rate,
          // total_sleep_duration is already in seconds in the sleep endpoint
          total_sleep_duration: record.total_sleep_duration,
          score: (record as any).score,
        }));

        // Log sample processed data
        if (sleepData.length > 0) {
          console.log("Sample processed Oura data:", {
            day: sleepData[0].day,
            average_hrv: sleepData[0].average_hrv,
            average_heart_rate: sleepData[0].average_heart_rate,
            total_sleep_duration: sleepData[0].total_sleep_duration,
          });
        }
      } else {
        const errorText = await sleepResponse.text();
        console.error("Oura sleep API error:", errorText);
      }

      // Process readiness data - READ BODY ONLY ONCE
      if (readinessResponse.ok) {
        const readinessResult = await readinessResponse.json();
        const readinessRecords = readinessResult.data || [];
        console.log(`Fetched ${readinessRecords.length} readiness records`);

        // Log sample record to see actual field names
        if (readinessRecords.length > 0) {
          console.log(
            "Sample readiness record:",
            JSON.stringify(readinessRecords[0], null, 2)
          );
        }

        readinessData = readinessRecords.map((record: any) => ({
          day:
            record.day ||
            record.date ||
            (record.timestamp
              ? String(record.timestamp).split("T")[0]
              : undefined),
          score: record.score,
        }));
      } else {
        const errorText = await readinessResponse.text();
        console.error("Oura readiness API error:", errorText);
      }

      // Process daily activity data - READ BODY ONLY ONCE
      if (dailyActivityResponse.ok) {
        const activityResult = await dailyActivityResponse.json();
        const activityRecords = activityResult.data || [];
        console.log(`Fetched ${activityRecords.length} daily activity records`);

        if (activityRecords.length > 0) {
          console.log(
            "Sample daily activity record:",
            JSON.stringify(activityRecords[0], null, 2)
          );
        }

        dailyActivityData = activityRecords.map((record: any) => ({
          day:
            record.day ||
            record.date ||
            (record.timestamp
              ? String(record.timestamp).split("T")[0]
              : undefined),
          active_calories:
            record.active_calories ??
            record.active_calories_total ??
            record.cal_active,
          total_calories: record.total_calories ?? record.cal_total,
        }));
      } else {
        const errorText = await dailyActivityResponse.text();
        console.error("Oura daily activity API error:", errorText);
      }

      // Process stress data - READ BODY ONLY ONCE
      if (stressResponse.ok) {
        const stressResult = await stressResponse.json();
        const stressRecords = stressResult.data || [];
        console.log(`Fetched ${stressRecords.length} stress records`);

        if (stressRecords.length > 0) {
          console.log(
            "Sample stress record:",
            JSON.stringify(stressRecords[0], null, 2)
          );
        }

        stressData = stressRecords.map((record: any) => ({
          day: record.day,
          stress_high: record.stress_high,
          recovery_high: record.recovery_high,
          day_summary: record.day_summary,
        }));
      } else {
        const errorText = await stressResponse.text();
        console.error("Oura stress API error:", errorText);
      }

      // Process resilience data - READ BODY ONLY ONCE
      if (resilienceResponse.ok) {
        const resilienceResult = await resilienceResponse.json();
        const resilienceRecords = resilienceResult.data || [];
        console.log(`Fetched ${resilienceRecords.length} resilience records`);

        if (resilienceRecords.length > 0) {
          console.log(
            "Sample resilience record:",
            JSON.stringify(resilienceRecords[0], null, 2)
          );
        }

        resilienceData = resilienceRecords.map((record: any) => ({
          day: record.day,
          contributors: record.contributors,
          level: record.level,
        }));
      } else {
        const errorText = await resilienceResponse.text();
        console.error("Oura resilience API error:", errorText);
      }
    } else {
      console.log("No Oura API token found");
    }

    // Calculate weekly burnout scores
    const weeklyScores: BurnoutScore[] = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

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

      // Filter activities for this week
      const weekActivities = activities.filter((activity: StravaActivity) => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= weekStart && activityDate <= weekEnd;
      });

      // Filter sleep data for this week
      const weekSleepData = sleepData.filter((sleep: OuraSleepData) => {
        const sleepDate = new Date(sleep.day);
        return sleepDate >= weekStart && sleepDate <= weekEnd;
      });

      // Filter Oura daily activity for this week
      const weekActivityData = dailyActivityData.filter(
        (act: OuraDailyActivityData) => {
          const actDate = new Date(act.day);
          return actDate >= weekStart && actDate <= weekEnd;
        }
      );

      const weekReadinessData = readinessData.filter((r: OuraReadinessData) => {
        const rDate = new Date(r.day);
        return rDate >= weekStart && rDate <= weekEnd;
      });

      // Filter stress data for this week
      const weekStressData = stressData.filter((stress: OuraStressData) => {
        const stressDate = new Date(stress.day);
        return stressDate >= weekStart && stressDate <= weekEnd;
      });

      // Filter resilience data for this week
      const weekResilienceData = resilienceData.filter(
        (resilience: OuraResilienceData) => {
          const resilienceDate = new Date(resilience.day);
          return resilienceDate >= weekStart && resilienceDate <= weekEnd;
        }
      );

      // Calculate individual scores
      const hrvScore = calculateHRVDropScore(weekSleepData);
      const rhrScore = calculateRestingHRScore(weekSleepData);
      const sleepScore = calculateSleepScoreRisk(weekSleepData);
      const subjectiveScore = calculateOuraCaloriesScore(weekActivityData);
      const readinessScore = calculateReadinessRisk(weekReadinessData);
      const stressScore = calculateStressScore(weekStressData);
      const resilienceScore = calculateResilienceScore(weekResilienceData);

      // Calculate total score
      const totalScore =
        finalWeights.hrv * hrvScore +
        finalWeights.rhr * rhrScore +
        finalWeights.sleep * sleepScore +
        finalWeights.subjective * subjectiveScore +
        (finalWeights.readiness || 0) * readinessScore +
        (finalWeights.stress || 0) * stressScore +
        (finalWeights.resilience || 0) * resilienceScore;

      weeklyScores.push({
        total_score: Math.round(totalScore * 100) / 100,
        breakdown: {
          hrv_drop_score: Math.round(hrvScore * 100) / 100,
          resting_hr_score: Math.round(rhrScore * 100) / 100,
          sleep_score: Math.round(sleepScore * 100) / 100,
          active_calories_score: Math.round(subjectiveScore * 100) / 100,
          readiness_score: Math.round(readinessScore * 100) / 100,
          stress_score: Math.round(stressScore * 100) / 100,
          resilience_score: Math.round(resilienceScore * 100) / 100,
        },
        weights: finalWeights,
        week_start: weekStartStr,
        week_end: weekEndStr,
      });
    }

    return NextResponse.json({
      weekly_scores: weeklyScores,
      summary: {
        average_score:
          Math.round(
            (weeklyScores.reduce((sum, week) => sum + week.total_score, 0) /
              weeklyScores.length) *
              100
          ) / 100,
        highest_score: Math.max(
          ...weeklyScores.map((week) => week.total_score)
        ),
        lowest_score: Math.min(...weeklyScores.map((week) => week.total_score)),
        total_weeks: weeklyScores.length,
      },
    });
  } catch (error) {
    console.error("Error calculating burnout score:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions for calculating individual scores
function calculateACWRScore(
  activities: StravaActivity[],
  weekStart: Date
): number {
  console.log(
    `Calculating ACWR for ${
      activities.length
    } activities, week starting: ${weekStart.toISOString()}`
  );
  if (activities.length === 0) return 0;

  // Calculate 7-day and 28-day average loads from the week start date
  const sevenDaysAgo = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(
    weekStart.getTime() - 28 * 24 * 60 * 60 * 1000
  );

  const sevenDayActivities = activities.filter(
    (activity: StravaActivity) => new Date(activity.start_date) >= sevenDaysAgo
  );
  const twentyEightDayActivities = activities.filter(
    (activity: StravaActivity) =>
      new Date(activity.start_date) >= twentyEightDaysAgo
  );

  console.log(
    `7-day activities: ${sevenDayActivities.length}, 28-day activities: ${twentyEightDayActivities.length}`
  );

  const sevenDayLoad =
    sevenDayActivities.reduce(
      (sum: number, activity: StravaActivity) =>
        sum +
        (activity.total_elevation_gain || 0) +
        (activity.distance || 0) * 0.1,
      0
    ) / 7;

  const twentyEightDayLoad =
    twentyEightDayActivities.reduce(
      (sum: number, activity: StravaActivity) =>
        sum +
        (activity.total_elevation_gain || 0) +
        (activity.distance || 0) * 0.1,
      0
    ) / 28;

  console.log(
    `7-day load: ${sevenDayLoad}, 28-day load: ${twentyEightDayLoad}`
  );

  if (twentyEightDayLoad === 0) return 0;

  const acwr = sevenDayLoad / twentyEightDayLoad;
  console.log(`ACWR ratio: ${acwr}`);

  // Score based on ACWR ranges: 0.8-1.3 is optimal, >1.5 is high risk
  if (acwr < 0.8) return 0.3; // Low load
  if (acwr <= 1.3) return 0.1; // Optimal
  if (acwr <= 1.5) return 0.6; // Moderate risk
  return 1.0; // High risk
}

function calculateHRVDropScore(sleepData: OuraSleepData[]): number {
  console.log(`Calculating HRV drop for ${sleepData.length} sleep records`);
  if (sleepData.length === 0) return 0;

  // Calculate average HRV and look for significant drops
  const hrvValues = sleepData
    .map((sleep: OuraSleepData) => sleep.average_hrv)
    .filter((hrv: number | undefined) => hrv && hrv > 0) as number[];

  console.log(`Valid HRV values: ${hrvValues.length}`);

  if (hrvValues.length === 0) return 0;

  const avgHRV =
    hrvValues.reduce((sum: number, hrv: number) => sum + hrv, 0) /
    hrvValues.length;
  const hrvDrops = hrvValues.filter((hrv: number) => hrv < avgHRV * 0.8).length;

  console.log(`Average HRV: ${avgHRV}, HRV drops: ${hrvDrops}`);
  return Math.min(hrvDrops / hrvValues.length, 1.0);
}

function calculateRestingHRScore(sleepData: OuraSleepData[]): number {
  console.log(`Calculating resting HR for ${sleepData.length} sleep records`);
  if (sleepData.length === 0) return 0;

  const rhrValues = sleepData
    .map((sleep: OuraSleepData) => sleep.average_heart_rate)
    .filter((rhr: number | undefined) => rhr && rhr > 0) as number[];

  console.log(`Valid RHR values: ${rhrValues.length}`);

  if (rhrValues.length === 0) return 0;

  const avgRHR =
    rhrValues.reduce((sum: number, rhr: number) => sum + rhr, 0) /
    rhrValues.length;
  const elevatedRHR = rhrValues.filter(
    (rhr: number) => rhr > avgRHR * 1.1
  ).length;

  console.log(`Average RHR: ${avgRHR}, Elevated RHR days: ${elevatedRHR}`);
  return Math.min(elevatedRHR / rhrValues.length, 1.0);
}

function calculateSleepScoreRisk(sleepData: OuraSleepData[]): number {
  console.log(
    `Calculating sleep score risk for ${sleepData.length} sleep records`
  );
  if (sleepData.length === 0) return 0;

  const scores = sleepData
    .map((s) => (typeof s.score === "number" ? s.score : undefined))
    .filter((v): v is number => typeof v === "number");

  if (scores.length === 0) return 0;

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length; // 0–100
  // Risk is inverse of score, normalized 0–1
  return Math.max(0, Math.min(1, (100 - avgScore) / 100));
}

function calculateTrainingStreakScore(activities: StravaActivity[]): number {
  if (activities.length === 0) return 0;

  // Sort activities by date
  const sortedActivities = activities.sort(
    (a: StravaActivity, b: StravaActivity) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  let currentStreak = 0;
  let maxStreak = 0;
  const currentDate = new Date();

  for (let i = 0; i < 30; i++) {
    // Check last 30 days
    const checkDate = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dayActivities = sortedActivities.filter(
      (activity: StravaActivity) => {
        const activityDate = new Date(activity.start_date);
        return activityDate.toDateString() === checkDate.toDateString();
      }
    );

    if (dayActivities.length > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Score based on streak length: 0-3 days = high risk, 4-6 = moderate, 7+ = low risk
  if (maxStreak <= 3) return 1.0;
  if (maxStreak <= 6) return 0.5;
  return 0.1;
}

function calculateOuraCaloriesScore(
  activityData: OuraDailyActivityData[]
): number {
  if (activityData.length === 0) return 0;

  const totalActiveCalories = activityData
    .map((d) => (typeof d.active_calories === "number" ? d.active_calories : 0))
    .reduce((a, b) => a + b, 0);

  if (totalActiveCalories <= 0) return 0;

  // Normalize to a weekly threshold; 5000 active kcal/week → score 1.0
  const weeklyHighCalories = 5000;
  return Math.min(totalActiveCalories / weeklyHighCalories, 1.0);
}

function calculateReadinessRisk(readinessData: OuraReadinessData[]): number {
  if (readinessData.length === 0) return 0;
  const scores = readinessData
    .map((r) => (typeof r.score === "number" ? r.score : undefined))
    .filter((v): v is number => typeof v === "number");
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Inverse mapping: low readiness → high risk
  return Math.max(0, Math.min(1, (100 - avg) / 100));
}

function calculateStressScore(stressData: OuraStressData[]): number {
  console.log(
    `Calculating stress score for ${stressData.length} stress records`
  );
  if (stressData.length === 0) return 0;

  // Calculate average stress_high duration and convert to percentage
  const stressHighValues = stressData
    .map((stress: OuraStressData) => stress.stress_high)
    .filter(
      (value: number | undefined) => typeof value === "number"
    ) as number[];

  if (stressHighValues.length === 0) return 0;

  const avgStressSeconds =
    stressHighValues.reduce((sum, val) => sum + val, 0) /
    stressHighValues.length;

  // Convert from seconds to percentage of day (86400 seconds = 24 hours)
  const secondsInDay = 24 * 60 * 60;
  const avgStressPercentage = (avgStressSeconds / secondsInDay) * 100;

  // Normalize stress percentage (0-100%) to risk score (0-1)
  // Higher stress percentage = higher risk
  return Math.min(avgStressPercentage / 100, 1.0);
}

function calculateResilienceScore(
  resilienceData: OuraResilienceData[]
): number {
  console.log(
    `Calculating resilience score for ${resilienceData.length} resilience records`
  );
  if (resilienceData.length === 0) return 0;

  // Map resilience levels to risk scores
  const levelRiskMap: { [key: string]: number } = {
    exceptional: 0.0,
    solid: 0.2,
    adequate: 0.4,
    limited: 0.8,
    compromised: 1.0,
  };

  const riskScores = resilienceData.map((resilience: OuraResilienceData) => {
    const level = resilience.level?.toLowerCase() || "limited";
    return levelRiskMap[level] ?? 0.6; // Default to moderate risk if unknown level
  });

  if (riskScores.length === 0) return 0;

  // Average risk across all resilience records
  return riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
}
