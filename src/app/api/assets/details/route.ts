// Fetch asset details

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAssetDetailsData } from "@/lib/stockPrices";
import yahooFinance from "yahoo-finance2";

// Disable yahoo validation error logging
yahooFinance.setGlobalConfig({ validation: { logErrors: false } });

interface AssetDetailsData {
  marketCap: number;
  volume24h: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingPE: number;
  trailingAnnualDividendYield: number;
}

export async function GET(request: Request) {
  await dbConnect();

  try {
    // Check user session authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "Missing or invalid symbol parameter" },
        { status: 400 },
      );
    }

    // Fetch information using the symbol
    const details = await getAssetDetailsData(symbol);

    const responseData: AssetDetailsData = {
      marketCap: details.marketCap,
      volume24h: details.volume24h,
      fiftyTwoWeekHigh: details.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: details.fiftyTwoWeekLow,
      trailingPE: details.trailingPE,
      trailingAnnualDividendYield: details.trailingAnnualDividendYield,
    };

    return NextResponse.json({ data: responseData }, { status: 200 });
  } catch (error) {
    console.error("Error fetching asset details:", error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
