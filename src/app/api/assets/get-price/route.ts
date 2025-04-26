// Fetch asset price

import { dbConnect } from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  await dbConnect();

  // Get symbol from the url
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol query parameter is required" },
      { status: 400 },
    );
  }
  try {
    // Search for the asset by symbol
    const asset = await Asset.findOne({ symbol: symbol.toUpperCase() });

    // Return asset price if found
    if (asset && asset.price) {
      return NextResponse.json({
        symbol: asset.symbol,
        price: asset.price,
        source: "database",
        lastUpdated: asset.lastUpdated || "Unknown",
      });
    } else {
      return NextResponse.json(
        {
          error: "Can't fetch price for symbol. Please try again later.",
        },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error(`Error fetching price for symbol ${symbol}:`, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    );
  }
}
