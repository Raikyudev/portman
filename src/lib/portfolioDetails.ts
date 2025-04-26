// Portfolio details utils file

import Portfolio from "@/models/Portfolio";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

interface IPortfolioDetails {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
}

export async function getPortfolios(
  portfolioIds: string[],
): Promise<IPortfolioDetails[]> {
  await dbConnect();

  // Convert string IDs to ObjectId
  const portfolioObjectIds = portfolioIds.map((id) =>
    mongoose.Types.ObjectId.createFromHexString(id),
  );

  return Portfolio.aggregate([
    {
      $match: {
        _id: { $in: portfolioObjectIds }, // Match portfolios by ID
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
      }, // Project required fields
    },
  ]);
}
