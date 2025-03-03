// src/app/api/watchlist/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Watchlist from "@/models/Watchlist";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStocksPriceForDay } from "@/lib/stockPrices"; // Adjust the import path
import { Types } from "mongoose";
import Asset from "@/models/Asset";

const watchlistSchema = z.object({
  asset_id: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid asset_id format",
  }),
});

interface WatchlistItem {
  _id: string; // Add Watchlist document _id
  asset_id: string; // Add asset_id reference
  symbol: string;
  price: number;
  change: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  await dbConnect();

  try {
    const userId = new Types.ObjectId((session.user as { id: string }).id);
    console.log("Fetching watchlist for userId:", userId.toString());

    const userWatchlist = await Watchlist.aggregate([
      {
        $match: {
          user_id: userId,
        },
      },
      {
        $lookup: {
          from: "assets",
          localField: "asset_id",
          foreignField: "_id",
          as: "asset",
        },
      },
      {
        $unwind: {
          path: "$asset",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: "$_id", // Include Watchlist _id
          asset_id: "$asset_id", // Include asset_id
          symbol: { $ifNull: ["$asset.symbol", null] }, // Retain symbol
        },
      },
    ]).exec();

    console.log("Raw userWatchlist from aggregation:", userWatchlist);

    if (!userWatchlist.length) {
      console.warn("No watchlist items found for user:", userId.toString());
      return NextResponse.json([], { status: 200 });
    }

    const symbols = userWatchlist
      .map((item) =>
        item.symbol && typeof item.symbol === "string" ? item.symbol : null,
      )
      .filter((symbol): symbol is string => symbol !== null);

    if (symbols.length === 0) {
      console.warn("No valid symbols found in watchlist after filtering");
      return NextResponse.json([], { status: 200 });
    }

    const holdings = symbols.reduce(
      (acc, symbol) => ({ ...acc, [symbol]: 1 }),
      {},
    );

    const currentDate = new Date().toISOString().split("T")[0];
    const currentPrices = await getStocksPriceForDay(holdings, currentDate);

    const previousDay = new Date();
    previousDay.setDate(previousDay.getDate() - 1);
    const previousPrices = await getStocksPriceForDay(
      holdings,
      previousDay.toISOString().split("T")[0],
    );

    const watchlistData: WatchlistItem[] = userWatchlist.map((item) => {
      const symbol = item.symbol || "";
      const currentPrice = currentPrices[symbol] || 0;
      const prevPrice = previousPrices[symbol] || currentPrice || 1; // Avoid division by zero
      const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;
      const change = `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`;

      return {
        _id: item._id.toString(),
        asset_id: item.asset_id.toString(),
        symbol,
        price: currentPrice,
        change,
      };
    });

    return NextResponse.json(watchlistData);
  } catch (error) {
    console.error("Error in watchlist API:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching the watchlist" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  console.log("Incoming POST body:", body);
  const result = watchlistSchema.safeParse(body);
  if (!result.success) {
    console.log("Validation Error:", result.error.format());
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  await dbConnect();

  const assetId = new Types.ObjectId(result.data.asset_id);
  console.log("Validating asset_id:", assetId.toString());
  const asset = await Asset.findById(assetId);
  if (!asset) {
    console.warn("Asset not found for asset_id:", assetId.toString());
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  console.log("Asset found:", asset);

  const existingWatchlist = await Watchlist.findOne({
    user_id: (session.user as { id: string }).id,
    asset_id: result.data.asset_id,
  });

  if (existingWatchlist) {
    return NextResponse.json(
      { error: "Asset already in watchlist" },
      { status: 400 },
    );
  }

  const newWatchlistAsset = new Watchlist({
    user_id: (session.user as { id: string }).id,
    asset_id: result.data.asset_id,
  });

  await newWatchlistAsset.save();

  return NextResponse.json(
    { message: `Added asset to the watchlist.` },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Asset ID is required " },
      { status: 400 },
    );
  }

  await dbConnect();

  const removedWatchlist = await Watchlist.findOneAndDelete({
    user_id: (session.user as { id: string }).id,
    asset_id: id,
  });

  if (!removedWatchlist) {
    return NextResponse.json(
      { error: "Asset not found in watchlist" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { message: "Removed from watchlist" },
    { status: 200 },
  );
}
