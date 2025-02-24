import Transaction from "@/models/Transaction";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

export async function getTransactions(portfolioId: string) {
  await dbConnect();

  console.log("Fetching transactions for portfolio:" + portfolioId);

  const transactions = await Transaction.aggregate([
    {
      $match: {
        portfolio_id: mongoose.Types.ObjectId.createFromHexString(portfolioId),
      },
    },
    {
      $lookup: {
        from: "assets",
        localField: "asset_id",
        foreignField: "_id",
        as: "assetDetails",
      },
    },
    {
      $unwind: "$assetDetails",
    },
    {
      $project: {
        _id: 1,
        portfolio_id: 1,
        asset_id: 1,
        tx_type: 1,
        quantity: 1,
        price_per_unit: 1,
        tx_date: 1,
        "asset_details.symbol": "$assetDetails.symbol",
      },
    },
  ]);
  console.log("Transactions found:", transactions);

  return transactions;
}
