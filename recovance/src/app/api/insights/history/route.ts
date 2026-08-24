import { NextRequest, NextResponse } from "next/server";
import { computeHistory } from "@/lib/insights/history";
import { getCachedInputs, memoResponse } from "@/lib/insights/insightsCache";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights/history?feature=F1
 *
 * The named metric recomputed over stepped trailing windows, straight from the
 * database. Same pure functions as the live number, so the history can never
 * disagree with the snapshot's definition.
 */
export async function GET(req: NextRequest) {
  try {
    const feature = new URL(req.url).searchParams.get("feature") ?? "";

    if (!/^F\d{1,2}$/.test(feature)) {
      return NextResponse.json(
        { error: "Pass ?feature=F1 … F15" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser(req);
    const { inputs, fingerprint } = await getCachedInputs(user.id);
    const history = await memoResponse(
      user.id,
      fingerprint,
      `history:${feature}`,
      () => computeHistory(feature, inputs)
    );

    if (!history) {
      return NextResponse.json(
        { error: `No history is defined for ${feature}.` },
        { status: 404 }
      );
    }

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error computing insight history:", error);
    return NextResponse.json(
      { error: "Failed to compute history" },
      { status: 500 }
    );
  }
}
