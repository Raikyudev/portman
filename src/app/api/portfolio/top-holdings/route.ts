import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import PortfolioAsset from "@/models/PortfolioAsset";
import PortfolioHistory from "@/models/PortfolioHistory"; // Import PortfolioHistory model
import { IAsset } from "@/models/Asset";
import mongoose from "mongoose";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("portfolio_id") || undefined;
  const limitAmount = Number(searchParams.get("limit")) || 5;

  await dbConnect();

  try {
    // Step 1: Determine which portfolios to query
    let portfolioIds: string[];
    if (portfolioId) {
      const portfolio = await Portfolio.findOne({
        _id: portfolioId,
        user_id: userId,
      });
      if (!portfolio) {
        return NextResponse.json(
          { error: "Portfolio not found or not owned by user" },
          { status: 404 },
        );
      }
      portfolioIds = [portfolioId];
    } else {
      const portfolios = await Portfolio.find({ user_id: userId }).select(
        "_id",
      );
      portfolioIds = portfolios.map((p) => p._id.toString());
    }

    // Step 2: Fetch the most recent total portfolio value from PortfolioHistory
    const getLatestPortfolioValue = async (ids: string[]): Promise<number> => {
      const date = new Date(); // Start with today
      const maxBacktrackDays = 30; // Limit to 30 days back (adjust as needed)
      let daysBacktracked = 0;
      let totalValue = 0;

      while (totalValue === 0 && daysBacktracked <= maxBacktrackDays) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0); // Midnight
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999); // End of day

        const history = await PortfolioHistory.aggregate([
          {
            $match: {
              portfolio_id: {
                $in: ids.map((id) => new mongoose.Types.ObjectId(id)),
              },
              port_history_date: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalValue: { $sum: "$port_total_value" },
            },
          },
        ]);

        if (history.length > 0) {
          totalValue = history[0].totalValue;
          break;
        }

        // Backtrack one day
        date.setDate(date.getDate() - 1);
        daysBacktracked++;
      }

      return totalValue;
    };

    const totalPortfolioValue = await getLatestPortfolioValue(portfolioIds);
    if (totalPortfolioValue === 0) {
      return NextResponse.json({ data: [] }); // No historical data found
    }

    // Step 3: Aggregate PortfolioAsset records with Asset data
    const portfolioAssets = await PortfolioAsset.aggregate([
      {
        $match: {
          portfolio_id: {
            $in: portfolioIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
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
      { $unwind: "$asset" },
    ]);

    if (!portfolioAssets.length) {
      return NextResponse.json({ data: [] });
    }

    // Step 4: Transform data into holdings
    const holdingsMap = new Map<string, Holding>();

    portfolioAssets.forEach((pa) => {
      const asset = pa.asset as IAsset;
      const value = pa.quantity * asset.price; // Current value based on latest price

      holdingsMap.set(asset._id.toString(), {
        name: asset.name,
        symbol: asset.symbol,
        shares: pa.quantity,
        value: value,
        percentage: 0, // Will calculate this using historical total
      });
    });

    // Step 5: Calculate percentage of portfolio for each holding using historical total
    const holdings = Array.from(holdingsMap.values()).map((holding) => ({
      ...holding,
      percentage:
        totalPortfolioValue > 0
          ? (holding.value / totalPortfolioValue) * 100
          : 0,
    }));
    console.log("Holdings:", holdings.length);
    // Step 6: Sort by value (descending) and limit to top holdings (e.g., top 5)
    const topHoldings = holdings
      .sort((a, b) => b.value - a.value)
      .slice(0, limitAmount === 0 ? holdings.length : limitAmount)
      .map((h) => ({
        ...h,
        percentage: Number(h.percentage.toFixed(2)),
        value: Number(h.value.toFixed(2)),
      }));

    return NextResponse.json({ data: topHoldings });
  } catch (error) {
    console.error("Error fetching top holdings:", error);
    return NextResponse.json(
      { error: "Failed to fetch top holdings" },
      { status: 500 },
    );
  }
}

// Define the shape of the response data to match TopHoldings component
interface Holding {
  name: string;
  symbol: string;
  shares: number;
  value: number;
  percentage: number;
}
