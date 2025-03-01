// pages/api/portfolio-history/save.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory";
import {
  calculateStockHoldings,
  calculatePortfolioValue,
} from "@/lib/portfolioCalculations";
import { getStockPrices } from "@/lib/stockPrices";
import { IExtendedTransaction } from "@/types/Transaction"; // Adjust import path
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust import path
import { getTransactions } from "@/lib/transactions"; // Adjust import path

export async function POST(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { portfolio_id, fromDate, toDate, forceUpdate } =
      await request.json();

    if (!portfolio_id || !fromDate || !toDate) {
      return NextResponse.json(
        { message: "Portfolio ID, fromDate, and toDate are required" },
        { status: 400 },
      );
    }

    // Fetch transactions
    const transactions = (await getTransactions(
      portfolio_id,
    )) as IExtendedTransaction[];
    if (transactions.length === 0) {
      return NextResponse.json(
        { message: "No transactions found" },
        { status: 404 },
      );
    }

    // Generate date range
    const allDates = getDateRange(fromDate, toDate);

    // Fetch existing history to check for missing days
    const existingHistory = await PortfolioHistory.find({ portfolio_id }).sort({
      port_history_date: 1,
    });
    const existingDates = new Set(
      existingHistory.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );
    const datesToCalculate = forceUpdate
      ? allDates
      : allDates.filter((date) => !existingDates.has(date));

    if (datesToCalculate.length === 0) {
      return NextResponse.json(
        { message: "No missing days to calculate" },
        { status: 200 },
      );
    }

    // Calculate and save history for missing days
    const newHistory = await Promise.all(
      datesToCalculate.map(async (date) => {
        const holdings = await calculateStockHoldings(transactions, date);
        const stockPrices = await getStockPrices(holdings, date);
        const port_total_value = calculatePortfolioValue(holdings, stockPrices);

        const existing = await PortfolioHistory.findOne({
          portfolio_id,
          port_history_date: new Date(date),
        });
        if (!existing) {
          const newHistoryEntry = new PortfolioHistory({
            portfolio_id,
            port_history_date: new Date(date),
            port_total_value,
          });
          await newHistoryEntry.save();
          return newHistoryEntry;
        } else if (forceUpdate) {
          existing.port_total_value = port_total_value;
          await existing.save();
          return existing;
        }
        return existing;
      }),
    );

    return NextResponse.json(
      { message: "Portfolio history updated", data: newHistory },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving portfolio history:" + error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error },
      { status: 500 },
    );
  }
}

// Helper function to generate date range
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}
