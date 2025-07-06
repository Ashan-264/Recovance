import { NextRequest, NextResponse } from "next/server";

interface BurnoutCalculationRequest {
  start_date: string;
  end_date: string;
  access_token: string;
  weights?: {
    acwr?: number;
    hrv?: number;
    rhr?: number;
    sleep?: number;
    streak?: number;
    subjective?: number;
  };
}

interface BurnoutScore {
  total_score: number;
  breakdown: {
    acwr_score: number;
    hrv_drop_score: number;
    resting_hr_score: number;
    sleep_debt_score: number;
    training_streak_score: number;
    perceived_exertion_score: number;
  };
  weights: {
    acwr: number;
    hrv: number;
    rhr: number;
    sleep: number;
    streak: number;
    subjective: number;
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
}

interface OuraSleepData {
  day: string;
  average_hrv?: number;
  average_heart_rate?: number;
  total_sleep_duration?: number;
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

    if (!start_date || !end_date || !access_token) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: start_date, end_date, access_token",
        },
        { status: 400 }
      );
    }

    // Default weights if not provided
    const defaultWeights = {
      acwr: 0.3,
      hrv: 0.2,
      rhr: 0.15,
      sleep: 0.2,
      streak: 0.1,
      subjective: 0.05,
    };

    const finalWeights = { ...defaultWeights, ...weights };

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
    console.log(
      `Fetched ${activities.length} Strava activities for date range ${start_date} to ${end_date}`
    );

    // Fetch Oura sleep data for the same period
    const ouraToken = process.env.OURA_API_TOKEN;
    let sleepData: OuraSleepData[] = [];

    if (ouraToken) {
      // Use correct Oura API v2 endpoints
      const dailySleepUrl = `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${start_date}&end_date=${end_date}`;
      const sleepUrl = `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start_date}&end_date=${end_date}`;
      const readinessUrl = `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start_date}&end_date=${end_date}`;

      console.log(`Fetching Oura daily sleep from: ${dailySleepUrl}`);
      console.log(`Fetching Oura sleep from: ${sleepUrl}`);
      console.log(`Fetching Oura readiness from: ${readinessUrl}`);

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

      // Log response statuses
      console.log(`Daily sleep response status: ${dailySleepResponse.status}`);
      console.log(`Sleep response status: ${sleepResponse.status}`);
      console.log(`Readiness response status: ${readinessResponse.status}`);

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
      } else {
        const errorText = await readinessResponse.text();
        console.error("Oura readiness API error:", errorText);
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

      // Calculate individual scores
      const acwrScore = calculateACWRScore(weekActivities, weekStart);
      const hrvScore = calculateHRVDropScore(weekSleepData);
      const rhrScore = calculateRestingHRScore(weekSleepData);
      const sleepScore = calculateSleepDebtScore(weekSleepData);
      const streakScore = calculateTrainingStreakScore(weekActivities);
      const subjectiveScore = calculatePerceivedExertionScore(weekActivities);

      // Calculate total score
      const totalScore =
        finalWeights.acwr * acwrScore +
        finalWeights.hrv * hrvScore +
        finalWeights.rhr * rhrScore +
        finalWeights.sleep * sleepScore +
        finalWeights.streak * streakScore +
        finalWeights.subjective * subjectiveScore;

      weeklyScores.push({
        total_score: Math.round(totalScore * 100) / 100,
        breakdown: {
          acwr_score: Math.round(acwrScore * 100) / 100,
          hrv_drop_score: Math.round(hrvScore * 100) / 100,
          resting_hr_score: Math.round(rhrScore * 100) / 100,
          sleep_debt_score: Math.round(sleepScore * 100) / 100,
          training_streak_score: Math.round(streakScore * 100) / 100,
          perceived_exertion_score: Math.round(subjectiveScore * 100) / 100,
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

function calculateSleepDebtScore(sleepData: OuraSleepData[]): number {
  console.log(`Calculating sleep debt for ${sleepData.length} sleep records`);
  if (sleepData.length === 0) return 0;

  const targetSleepHours = 8;
  const sleepDurations = sleepData
    .map((sleep: OuraSleepData) =>
      sleep.total_sleep_duration ? sleep.total_sleep_duration / 3600 : 0
    ) // Convert seconds to hours
    .filter((duration: number) => duration > 0);

  console.log(`Valid sleep durations: ${sleepDurations.length}`);

  if (sleepDurations.length === 0) return 0;

  const sleepDebt = sleepDurations.reduce(
    (total: number, duration: number) =>
      total + Math.max(0, targetSleepHours - duration),
    0
  );

  console.log(`Total sleep debt: ${sleepDebt} hours`);
  return Math.min(sleepDebt / (sleepDurations.length * targetSleepHours), 1.0);
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

function calculatePerceivedExertionScore(activities: StravaActivity[]): number {
  if (activities.length === 0) return 0;

  // Look for RPE in activity descriptions or use suffer score as proxy
  const highEffortActivities = activities.filter((activity: StravaActivity) => {
    const description = (activity.description || "").toLowerCase();
    const hasRPE =
      description.includes("rpe") ||
      description.includes("rate of perceived exertion");
    const highSufferScore =
      activity.suffer_score && activity.suffer_score > 100;

    return hasRPE || highSufferScore;
  });

  return Math.min(highEffortActivities.length / activities.length, 1.0);
}
