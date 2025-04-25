// pages/api/asset-price-data/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFullPriceHistory } from "@/lib/stockPrices"; // Updated import
import { getTodayDate } from "@/lib/utils";
import { Types } from "mongoose";
import yahooFinance from "yahoo-finance2";

yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
interface PriceData {
  date: string;
  price: number;
}

interface AssetPriceResponse {
  name: string;
  symbol: string;
  priceHistory: PriceData[];
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
    const assetId = searchParams.get("asset_id");
    const period = searchParams.get("period") as "W" | "M" | "YTD" | "Y" | null;

    if (!assetId || !Types.ObjectId.isValid(assetId)) {
      return NextResponse.json(
        { error: "Invalid or missing asset_id" },
        { status: 400 },
      );
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const endDate = getTodayDate();
    let startDate: string;

    const today = new Date(endDate);
    switch (period?.toUpperCase()) {
      case "W":
        startDate = new Date(today.setDate(today.getDate() - 7))
          .toISOString()
          .split("T")[0];
        break;
      case "M":
        startDate = new Date(today.setMonth(today.getMonth() - 1))
          .toISOString()
          .split("T")[0];
        break;
      case "YTD":
        startDate = new Date(today.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        break;
      case "Y":
        startDate = new Date(today.setFullYear(today.getFullYear() - 1))
          .toISOString()
          .split("T")[0];
        break;
      default:
        startDate = new Date(today.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        break;
    }

    // Optionally constrain startDate for YTD or default cases
    const earliestTransactionDate = "2025-01-01"; // Adjust based on your data
    if (period?.toUpperCase() === "YTD" || !period) {
      startDate = new Date(
        Math.max(
          new Date(startDate).getTime(),
          new Date(earliestTransactionDate).getTime(),
        ),
      )
        .toISOString()
        .split("T")[0];
    }

    // Use the new getFullPriceHistory function
    let priceHistory = await getFullPriceHistory(
      asset.symbol,
      startDate,
      endDate,
    );

    priceHistory = priceHistory.filter((entry: PriceData) => entry.price !== 0);
    const responseData: AssetPriceResponse = {
      name: asset.name,
      symbol: asset.symbol,
      priceHistory: priceHistory, // Directly use the array from getFullPriceHistory
    };

    return NextResponse.json({ data: responseData }, { status: 200 });
  } catch (error) {
    console.error("Error fetching asset price data:", error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
