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

    const { searchParams } = new URL(req.url);
    const per_page = searchParams.get("per_page") || "100";
    const page = searchParams.get("page") || "1";
    const after = searchParams.get("after"); // Unix timestamp for filtering activities after this date

    let url = `https://www.strava.com/api/v3/athlete/activities?per_page=${per_page}&page=${page}`;
    if (after) {
      url += `&after=${after}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Strava API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
