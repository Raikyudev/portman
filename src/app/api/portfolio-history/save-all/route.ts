import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import PortfolioHistory from "@/models/PortfolioHistory";
import PortfolioAsset from "@/models/PortfolioAsset";
import mongoose from "mongoose";

export async function POST() {
  await dbConnect();

  try {
    // Fetch all portfolios
    const portfolios = await Portfolio.find();

    if (!portfolios.length) {
      return NextResponse.json(
        { message: "No portfolios found" },
        { status: 404 },
      );
    }

    for (const portfolio of portfolios) {
      const portfolio_id = portfolio._id;

      // Aggregate assets for the portfolio
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
            currency: 1,
            "asset_info.symbol": 1,
            "asset_info.name": 1,
          },
        },
      ]);

      if (!portfolioAssets.length) {
        console.warn(`No assets found for portfolio: ${portfolio_id}`);
        continue;
      }

      let totalValue = 0;
      const currency = portfolioAssets[0].asset_info.currency;

      portfolioAssets.forEach(({ asset_info, quantity }) => {
        totalValue += asset_info.price * quantity;
      });

      const newHistory = new PortfolioHistory({
        portfolio_id,
        portfolio_total_value: totalValue,
        portfolio_total_value_currency: currency,
      });

      await newHistory.save();
    }

    return NextResponse.json(
      { message: "Portfolio history updated for all users" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving portfolio history for all users:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
