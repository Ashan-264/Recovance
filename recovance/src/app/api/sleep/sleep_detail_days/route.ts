import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { start_date, end_date } = await req.json();

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing start_date or end_date" },
        { status: 400 }
      );
    }

    const token = process.env.OURA_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Missing OURA_API_TOKEN" },
        { status: 500 }
      );
    }

    const url = `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start_date}&end_date=${end_date}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Oura API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      data: data.data || [],
      next_token: data.next_token || null,
    });
  } catch (error) {
    console.error("Error fetching sleep data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
