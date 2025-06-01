// app/api/route.ts

import { NextRequest, NextResponse } from "next/server";

// Handles GET requests to /api
export async function GET(req: NextRequest) {
  console.log(req);
  return NextResponse.json({ message: "GET request received" });
}

// Handles POST requests to /api
export async function POST(req: NextRequest) {
  const data = await req.json();
  return NextResponse.json({ message: "POST request received", data });
}
