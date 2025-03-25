import { NextResponse } from "next/server";
import fetchAssets from "@/lib/fetchAssets";
import { dbConnect, closeDatabase } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    await dbConnect();
    await fetchAssets(request);

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
