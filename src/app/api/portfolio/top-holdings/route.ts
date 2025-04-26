// Fetch user's top holdings route

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import PortfolioAsset from "@/models/PortfolioAsset";
import PortfolioHistory from "@/models/PortfolioHistory";
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
    // Find which portfolio to query
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

    // Fetch latest portfolio value
    const getLatestPortfolioValue = async (ids: string[]): Promise<number> => {
      const date = new Date();
      const maxBacktrackDays = 30;
      let daysBacktracked = 0;
      let totalValue = 0;

      while (totalValue === 0 && daysBacktracked <= maxBacktrackDays) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

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

        date.setDate(date.getDate() - 1);
        daysBacktracked++;
      }

      return totalValue;
    };

    const totalPortfolioValue = await getLatestPortfolioValue(portfolioIds);
    if (totalPortfolioValue === 0) {
      return NextResponse.json({ data: [] });
    }

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

    // Build holdings map
    const holdingsMap = new Map<string, Holding>();

    portfolioAssets.forEach((pa) => {
      const asset = pa.asset as IAsset;
      const value = pa.quantity * asset.price;

      holdingsMap.set(asset._id.toString(), {
        id: asset._id.toString(),
        name: asset.name,
        symbol: asset.symbol,
        shares: pa.quantity,
        value: value,
        percentage: 0,
      });
    });

    // Calculate percentages based on portfolio total
    const holdings = Array.from(holdingsMap.values()).map((holding) => ({
      ...holding,
      percentage:
        totalPortfolioValue > 0
          ? (holding.value / totalPortfolioValue) * 100
          : 0,
    }));

    // Sort and limit results
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

interface Holding {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  value: number;
  percentage: number;
}
