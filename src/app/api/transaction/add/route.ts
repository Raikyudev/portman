//Route to add buy or sell transaction to a portfolio

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import Transaction from "@/models/Transaction";
import Asset from "@/models/Asset";
import { NextResponse } from "next/server";
import { z } from "zod";
import PortfolioAsset from "@/models/PortfolioAsset";
import { getExchangeRate } from "@/lib/currencyExchange";
import mongoose from "mongoose";

const transactionSchema = z.object({
  portfolio_id: z.string(),
  asset_id: z.string(),
  tx_type: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price_per_unit: z.number().positive(),
  currency: z.string(),
  tx_date: z.string(),
});

export async function POST(request: Request) {
  // Authenticate user
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !(session.user as { id?: string }).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate request
  const body = await request.json();
  const result = transactionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  await dbConnect();

  // Verify portfolio ownership
  const portfolio = await Portfolio.findOne({
    _id: result.data.portfolio_id,
    user_id: (session.user as { id: string }).id,
  });

  if (!portfolio) {
    return NextResponse.json(
      { error: "Portfolio not found or unauthorized" },
      { status: 403 },
    );
  }

  // Verify asset exists
  const asset = await Asset.findById(
    mongoose.Types.ObjectId.createFromHexString(
      result.data.asset_id.toString(),
    ),
  );
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Fetch exchange rate and check if the asset is already in the portfolio
  const existingPortfolioAsset = await PortfolioAsset.findOne({
    portfolio_id: result.data.portfolio_id,
    asset_id: result.data.asset_id,
  });
  const exchange_rate = (await getExchangeRate(result.data.currency)).rate;

  // Handle buy and sell transactions
  if (result.data.tx_type === "buy") {
    const usd_price_per_unit = result.data.price_per_unit / exchange_rate;

    if (existingPortfolioAsset) {
      // Update average buy price and quantity
      const totalOldValue =
        existingPortfolioAsset.quantity * existingPortfolioAsset.avg_buy_price;
      const totalNewValue = result.data.quantity * usd_price_per_unit;
      const totalQuantity =
        existingPortfolioAsset.quantity + result.data.quantity;

      existingPortfolioAsset.avg_buy_price =
        (totalOldValue + totalNewValue) / totalQuantity;
      existingPortfolioAsset.quantity = totalQuantity;

      await existingPortfolioAsset.save();
    } else {
      // Add new asset to portfolio
      const newPortfolioAsset = new PortfolioAsset({
        portfolio_id: result.data.portfolio_id,
        asset_id: result.data.asset_id,
        quantity: result.data.quantity,
        avg_buy_price: usd_price_per_unit,
        created_at: new Date(),
      });

      await newPortfolioAsset.save();
    }
  } else if (result.data.tx_type === "sell") {
    if (
      !existingPortfolioAsset ||
      existingPortfolioAsset.quantity < result.data.quantity
    ) {
      return NextResponse.json(
        { error: "Not enough shares to sell" },
        { status: 400 },
      );
    }

    existingPortfolioAsset.quantity -= result.data.quantity;

    // Remove portfolio asset if quantity becomes 0
    if (existingPortfolioAsset.quantity === 0) {
      await existingPortfolioAsset.deleteOne({
        _id: existingPortfolioAsset._id,
      });
    } else {
      await existingPortfolioAsset.save();
    }
  } else {
    return NextResponse.json(
      { error: "Invalid transaction type" },
      { status: 400 },
    );
  }

  const transaction = new Transaction({
    portfolio_id: result.data.portfolio_id,
    asset_id: result.data.asset_id,
    tx_type: result.data.tx_type,
    quantity: result.data.quantity,
    price_per_unit: result.data.price_per_unit,
    currency: result.data.currency,
    tx_date: result.data.tx_date,
  });

  await transaction.save();
  return NextResponse.json(transaction, { status: 201 });
}
