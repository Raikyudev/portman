import Portfolio from "@/models/Portfolio";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

// Define the structure of the returned portfolio data
interface IPortfolioDetails {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
}

export async function getPortfolios(
  portfolioIds: string[],
): Promise<IPortfolioDetails[]> {
  await dbConnect();

  console.log("Fetching portfolios for IDs:", portfolioIds);

  // Convert string IDs to ObjectId
  const portfolioObjectIds = portfolioIds.map((id) =>
    mongoose.Types.ObjectId.createFromHexString(id),
  );

  const portfolios = await Portfolio.aggregate([
    {
      $match: {
        _id: { $in: portfolioObjectIds },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
      },
    },
  ]);

  console.log("Portfolios found:", portfolios);

  return portfolios;
}
