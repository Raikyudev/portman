// Get transactions function

import Transaction from "@/models/Transaction";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

// Fetch transactions linked to a portfolio with asset symbols
export async function getTransactions(portfolioId: string) {
  await dbConnect();

  return Transaction.aggregate([
    {
      $match: {
        portfolio_id: mongoose.Types.ObjectId.createFromHexString(portfolioId), // Filter by portfolio ID
      },
    },
    {
      $lookup: {
        from: "assets", // Join with assets collection
        localField: "asset_id", // Link on asset ID
        foreignField: "_id",
        as: "assetDetails",
      },
    },
    {
      $unwind: "$assetDetails", // Flatten assetDetails array
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
        "asset_details.symbol": "$assetDetails.symbol", // Only include asset symbol
      },
    },
  ]);
}
