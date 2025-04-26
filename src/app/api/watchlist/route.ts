// Route to manage user's watchlist (fetch, add, remove)

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Watchlist from "@/models/Watchlist";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import Asset from "@/models/Asset";
import { getPriceChange } from "@/lib/stockPrices";

const watchlistSchema = z.object({
  asset_id: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid asset_id format",
  }),
});

interface WatchlistItem {
  _id: string; // Watchlist document _id
  asset_id: string; // asset_id reference
  symbol: string;
  price: number;
  change: string;
}

export async function GET() {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  await dbConnect();

  try {
    // Fetch user's watchlist
    const userId = new Types.ObjectId((session.user as { id: string }).id);
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
          _id: "$_id",
          asset_id: "$asset_id",
          symbol: { $ifNull: ["$asset.symbol", null] },
          price: { $ifNull: ["$asset.price", 0] },
        },
      },
    ]).exec();

    if (!userWatchlist.length) {
      console.warn("No watchlist items found for user:", userId.toString());
      return NextResponse.json([], { status: 200 });
    }

    // Fetch dynamic price changes for each symbol
    const watchlistData: WatchlistItem[] = await Promise.all(
      userWatchlist.map(async (item) => {
        const changePercent = await getPriceChange(item.symbol || "");
        const formattedChange = `${changePercent.toFixed(2)}%`;
        return {
          _id: item._id.toString(),
          asset_id: item.asset_id.toString(),
          symbol: item.symbol || "",
          price: item.price || 0,
          change: formattedChange,
        };
      }),
    );

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
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const result = watchlistSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  await dbConnect();

  // Validate asset
  const assetId = new Types.ObjectId(result.data.asset_id);
  const asset = await Asset.findById(assetId);
  if (!asset) {
    console.warn("Asset not found for asset_id:", assetId.toString());
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Check for duplicate asset in watchlist
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

  // Add new asset to watchlist
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
  // Authenticate user
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

  // Remove asset from watchlist
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
