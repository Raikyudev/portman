import { NextResponse } from "next/server";
import fetchAssets from "@/lib/fetchAssets";

export async function GET() {
    try {
        await fetchAssets();
        return NextResponse.json({ message: "Assets fetched successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error in API route:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}