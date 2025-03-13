import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAssetDetailsData } from "@/lib/stockPrices";
import yahooFinance from "yahoo-finance2";

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
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.log("Unauthorized session in GET:", { session });
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

    console.log(`Fetching details for symbol: ${symbol}`);

    // Call the getAssetDetailsData function to fetch and convert the data
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
