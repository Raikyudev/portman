import { NextResponse } from "next/server";
import fetchAssets from "@/lib/fetchAssets";
import { dbConnect, closeDatabase } from "@/lib/mongodb";
import CronJobTracker from "@/models/CronJobTracker";

export async function GET() {
  try {
    const response = NextResponse.json(
      { message: "fetchAssets started" },
      { status: 202 },
    );

    await (async () => {
      try {
        await dbConnect();
        console.log("Database connected. Fetching assets...");

        const interval = setInterval(() => {
          console.log("Still processing fetchAssets...");
        }, 60 * 1000);

        await fetchAssets();
        console.log("fetchAssets completed successfully");

        await CronJobTracker.findOneAndUpdate(
          { job: "fetchAssets" },
          { lastRun: new Date() },
          { upsert: true, new: true },
        );

        await closeDatabase();
        console.log("Database connection closed.");

        clearInterval(interval);
      } catch (error) {
        console.error("Error in background fetchAssets execution:", error);
      }
    })();

    return response;
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
