import { dbConnect } from "@/lib/mongodb";
import PortfolioAsset from "@/models/PortfolioAsset";

import { NextResponse } from "next/server";
import PortfolioHistory from "@/models/PortfolioHistory";
import mongoose from "mongoose";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const data = await request.json();

    const { portfolio_id } = data;

    if (!portfolio_id) {
      return new Response("Missing portfolio_id", { status: 400 });
    }

    const portfolioAssets = await PortfolioAsset.aggregate([
      {
        $match: {
          portfolio_id:
            mongoose.Types.ObjectId.createFromHexString(portfolio_id),
        },
      },
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
          quantity: 1,
          avg_buy_price: 1,
          "asset_info.symbol": 1,
          "asset_info.name": 1,
          "asset_info.price": 1,
          "asset_info.currency": 1,
        },
      },
    ]);

    if (!portfolioAssets.length) {
      return NextResponse.json(
        { message: "No assets found for this portfolio" },
        { status: 404 },
      );
    }

    let totalValue = 0;
    const currency = portfolioAssets[0].asset_info.currency;

    portfolioAssets.forEach(({ asset_info, quantity }) => {
      totalValue += asset_info.price * quantity;
    });

    const newHistory = new PortfolioHistory({
      portfolio_id,
      port_history_date: new Date(),
      port_total_value: totalValue,
      port_total_value_currency: currency,
    });

    await newHistory.save();

    return NextResponse.json(
      { message: "Portfolio history saved ", data: newHistory },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving portfolio history: " + error);
    return NextResponse.json(
      { message: "Error saving portfolio history" },
      { status: 500 },
    );
  }
}
