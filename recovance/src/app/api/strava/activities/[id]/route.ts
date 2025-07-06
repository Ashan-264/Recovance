import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access_token = req.headers.get("Authorization")?.split("Bearer ")[1];

    if (!access_token) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    if (!params.id) {
      return NextResponse.json(
        { error: "Missing activity ID" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${params.id}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

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
    console.error("Error fetching activity details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
