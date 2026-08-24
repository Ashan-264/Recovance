import { NextRequest, NextResponse } from "next/server";
import {
  disciplineDrift,
  recoveryCost,
  recoveryLatency,
  restDayAudit,
} from "@/lib/insights/features";
import { aggregateLoadSplits } from "@/lib/insights/loadSplit";
import { truncateInputs } from "@/lib/insights/inputs";
import { getCachedInputs, memoResponse } from "@/lib/insights/insightsCache";
import {
  descentSkill,
  fearArousal,
  matchTrails,
  sleepDebtWeekends,
  trailProgression,
} from "@/lib/insights/trailFeatures";
import {
  illnessWarning,
  illnessWarningReady,
  interferenceStatus,
  lastIllnessDay,
  lastSendDayGateDay,
  sendDayGate,
  sendDayGateReady,
} from "@/lib/insights/gates";
import { FEATURES } from "@/lib/insights/registry";
import {
  aerobicDurability,
  climbRepeatability,
  gripChainSpacing,
} from "@/lib/insights/streamFeatures";
import type { RunOnTrail } from "@/lib/insights/trailFeatures";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Computes every insight the stored data can support and reports the gate
 * status of the ones it cannot.
 *
 * Reads only from Postgres — no provider calls — so the page loads at cache
 * speed and works whether or not a connection is currently valid.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // ?as_of=YYYY-MM-DD recomputes every feature using only data up to that
    // day — the number you would have seen then.
    const asOfParam = new URL(req.url).searchParams.get("as_of");
    const asOf =
      asOfParam && /^\d{4}-\d{2}-\d{2}$/.test(asOfParam) ? asOfParam : undefined;
    if (asOfParam && !asOf) {
      return NextResponse.json(
        { error: "as_of must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const { inputs: fullInputs, fingerprint } = await getCachedInputs(user.id);
    const inputs = asOf ? truncateInputs(fullInputs, asOf) : fullInputs;
    const payload = await memoResponse(
      user.id,
      fingerprint,
      `snapshot:${asOf ?? "now"}`,
      () => {
    const {
      activities,
      readings,
      hrvNights,
      stressDays,
      trainingDays,
      summaries,
      withSegments,
      descentRuns,
      pendingSplits,
      streams,
    } = inputs;

    // Day-verdict features evaluate the picked day (or the latest day with
    // any data when viewing today).
    const lastDataDay = [
      ...readings.map((reading) => reading.day),
      ...activities.map((activity) => activity.day),
    ]
      .sort()
      .pop();
    const effectiveDay = asOf ?? lastDataDay ?? new Date().toISOString().slice(0, 10);

    const results: Record<string, unknown> = {
      F1: recoveryCost(activities, readings),
      F4: recoveryLatency(hrvNights, readings, trainingDays),
      F6: restDayAudit(stressDays, trainingDays, readings),
      F14: disciplineDrift(activities),
    };

    // Parked-with-progress: F2 always reports its state for the day.
    const interference = interferenceStatus(activities, effectiveDay);

    const sendDay = sendDayGate(readings, summaries, activities, effectiveDay);
    if (sendDayGateReady(sendDay)) {
      results.F3 = sendDay;
    }

    const illness = illnessWarning(readings, activities, effectiveDay);
    if (illnessWarningReady(illness)) {
      results.F5 = illness;
    }

    if (summaries.length > 0) {
      results.F12 = aggregateLoadSplits(summaries);
    }

    if (withSegments.length > 0) {
      const repeatability = climbRepeatability(withSegments);
      if (repeatability.n >= 5) {
        results.F10 = repeatability;
      }

      const durability = aerobicDurability(withSegments);
      if (durability.n >= 8) {
        results.F11 = durability;
      }

      const gripChain = gripChainSpacing(withSegments, activities);
      if (gripChain.ridesWithLoad >= 10 && gripChain.strengthSessions >= 1) {
        results.F13 = gripChain;
      }
    }

    // Trail-matched features: the floor is repeated trails, not raw rides.
    if (descentRuns.length > 0) {
      const trails = matchTrails(descentRuns);

      const skill = descentSkill(trails);
      if (skill.trails >= 3 && skill.scoredRuns >= 30) {
        results.F7 = skill;
      }

      const arousal = fearArousal(trails);
      if (arousal.trails >= 2) {
        results.F8 = arousal;
      }

      const progression = trailProgression(trails);
      if (progression.trails.length >= 3) {
        results.F9 = progression;
      }

      const runsByDay = new Map<string, RunOnTrail[]>();
      for (const run of descentRuns) {
        const list = runsByDay.get(run.day) ?? [];
        list.push(run);
        runsByDay.set(run.day, list);
      }
      const sleepDebt = sleepDebtWeekends(runsByDay, readings);
      if (sleepDebt.qualifyingWeekends >= 10) {
        results.F15 = sleepDebt;
      }
    }

    const live = new Set(Object.keys(results));


    // Even parked, these carry their measured state for the viewed day so the
    // card can say "21/60 nights by then" instead of a generic sentence.
    const parkedContext: Record<string, unknown> = {
      F2: { ...interference, lastLiveDay: null },
      ...(live.has("F3")
        ? {}
        : { F3: { ...sendDay, lastLiveDay: lastSendDayGateDay(inputs.allReadings) } }),
      ...(live.has("F5")
        ? {}
        : { F5: { ...illness, lastLiveDay: lastIllnessDay(inputs.allReadings) } }),
    };

    return {
      features: FEATURES.map((feature) => ({
        ...feature,
        status: live.has(feature.id) ? "live" : "parked",
        result: results[feature.id] ?? null,
        parkedContext: parkedContext[feature.id] ?? null,
      })),
      coverage: {
        activities: activities.length,
        nightsWithHrv: readings.filter((reading) => reading.hrv !== null).length,
        nightsWithHrvSeries: hrvNights.length,
        stressDays: stressDays.length,
        streams,
        ridesAnalyzed: summaries.length,
        pendingSplits,
        asOf: asOf ?? null,
        effectiveDay,
      },
    };
      }
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error computing insights:", error);
    return NextResponse.json(
      { error: "Failed to compute insights" },
      { status: 500 }
    );
  }
}
