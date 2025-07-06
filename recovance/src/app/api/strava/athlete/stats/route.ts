import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const access_token = req.headers.get("Authorization")?.split("Bearer ")[1];

    if (!access_token) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    // First get the current athlete to get their ID
    const athleteResponse = await fetch(
      "https://www.strava.com/api/v3/athlete",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!athleteResponse.ok) {
      const errorText = await athleteResponse.text();
      return NextResponse.json(
        { error: `Strava API error: ${errorText}` },
        { status: athleteResponse.status }
      );
    }

    const athlete = await athleteResponse.json();
    const athleteId = athlete.id;

    // Then get the athlete's stats
    const statsResponse = await fetch(
      `https://www.strava.com/api/v3/athletes/${athleteId}/stats`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      return NextResponse.json(
        { error: `Strava API error: ${errorText}` },
        { status: statsResponse.status }
      );
    }

    const data = await statsResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching athlete stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
