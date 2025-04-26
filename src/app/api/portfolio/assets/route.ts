// Fetch portfolio assets route

import { dbConnect } from "@/lib/mongodb";
import PortfolioAsset from "@/models/PortfolioAsset";
import { NextResponse } from "next/server";

import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "No portfolio ID" }, { status: 400 });
    }

    // Aggregate portfolio assets with asset information
    const portfolioAssets = await PortfolioAsset.aggregate([
      { $match: { portfolio_id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "assets",
          localField: "asset_id",
          foreignField: "_id",
          as: "asset_info",
        },
      },
      { $unwind: "$asset_info" },
      {
        $project: {
          _id: 1,
          portfolio_id: 1,
          asset_id: 1,
          quantity: 1,
          avg_buy_price: 1,
          "asset_info.symbol": 1,
          "asset_info.name": 1,
          "asset_info.currency": 1,
        },
      },
    ]);

    return NextResponse.json(portfolioAssets);
  } catch (error) {
    console.error("Error fetching portfolio assets: " + error);
    return NextResponse.json(
      { error: "Error fetching portfolio assets" },
      { status: 500 },
    );
  }
}
