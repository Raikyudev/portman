// Route for asset price chart component

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFullPriceHistory } from "@/lib/stockPrices";
import { getTodayDate } from "@/lib/utils";
import { Types } from "mongoose";
import yahooFinance from "yahoo-finance2";

// Remove yahoofinance validation logging
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
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.log("Unauthorized session in GET:", { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get parameters from url
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("asset_id");
    const period = searchParams.get("period") as "W" | "M" | "YTD" | "Y" | null;

    if (!assetId || !Types.ObjectId.isValid(assetId)) {
      return NextResponse.json(
        { error: "Invalid or missing asset_id" },
        { status: 400 },
      );
    }

    // Find asset in the DB, return error if not found
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const endDate = getTodayDate();
    let startDate: string;

    // Set price date range based on the selected period
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

    // Fetch price history between startDate and endDate
    let priceHistory = await getFullPriceHistory(
      asset.symbol,
      startDate,
      endDate,
    );

    // Filter out any zero-price entries
    priceHistory = priceHistory.filter((entry: PriceData) => entry.price !== 0);

    const responseData: AssetPriceResponse = {
      name: asset.name,
      symbol: asset.symbol,
      priceHistory,
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
