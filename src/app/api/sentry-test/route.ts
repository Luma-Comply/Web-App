import { NextResponse } from "next/server";

export async function GET() {
  // Trigger a test error to verify Sentry is working
  throw new Error("Sentry test error - integration is working!");

  return NextResponse.json({ success: true });
}
