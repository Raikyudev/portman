import { NextResponse } from "next/server";
import fetchAssets from "@/lib/fetchAssets";
import { dbConnect, closeDatabase } from "@/lib/mongodb";
import CronJobTracker from "@/models/CronJobTracker";

export async function GET() {
  try {
    await fetchAssets();
    await dbConnect();

    await CronJobTracker.findOneAndUpdate(
      { job: "fetchAssets" },
      { lastRun: new Date() },
      { upsert: true, new: true },
    );
    await closeDatabase();
    return NextResponse.json(
      { message: "Assets fetched successfully" },
      { status: 200 },
    );
  } catch (error) {
    await closeDatabase();
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
