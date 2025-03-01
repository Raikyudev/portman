// pages/api/portfolio-history/aggregate-save.ts
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
import Portfolio from "@/models/Portfolio"; // Adjust import path
import { getTodayDate } from "@/lib/utils"; // Hypothetical utility function

export async function POST(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    console.log("Session from getServerSession:", { session });

    const {
      fromDate,
      toDate,
      forceUpdate,
      userId: bodyUserId,
    } = await request.json();
    console.log("Received request body:", {
      fromDate,
      toDate,
      forceUpdate,
      bodyUserId,
    });

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { message: "fromDate and toDate are required" },
        { status: 400 },
      );
    }

    // Validate userId from session or body
    const userId = session?.user?.id || bodyUserId;
    console.log("Using userId:", userId);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: No userId provided" },
        { status: 401 },
      );
    }

    // Fetch all portfolios for the user
    const portfolios = await Portfolio.find({ user_id: userId }).select("_id");
    console.log("Portfolios fetched:", portfolios);
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json(
        { message: "No portfolios found" },
        { status: 404 },
      );
    }

    // Fetch transactions for all portfolios
    const allTransactions: IExtendedTransaction[] = [];
    for (const portfolio of portfolios) {
      const transactions = (await getTransactions(
        portfolio._id.toString(),
      )) as IExtendedTransaction[];
      allTransactions.push(...transactions);
    }

    if (allTransactions.length === 0) {
      return NextResponse.json(
        { message: "No transactions found" },
        { status: 404 },
      );
    }

    // Generate date range, capping at today
    const today = getTodayDate(); // Returns "2025-03-01" as ISO string
    const adjustedToDate = toDate > today ? today : toDate;
    const allDates = getDateRange(fromDate, adjustedToDate);
    console.log(
      "Date range generated (capped at today):",
      allDates.length,
      "days",
      { fromDate, toDate, adjustedToDate },
    );

    // Fetch existing aggregated history
    const existingHistory = await PortfolioHistory.find({
      portfolio_id: userId,
    }).sort({ port_history_date: 1 });
    const existingDates = new Set(
      existingHistory.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );
    const datesToCalculate = forceUpdate
      ? allDates
      : allDates.filter((date) => !existingDates.has(date));
    console.log("Dates to calculate:", datesToCalculate.length);

    if (datesToCalculate.length === 0) {
      return NextResponse.json(
        { message: "No missing days to calculate" },
        { status: 200 },
      );
    }

    // Track last known prices
    const lastKnownPrices: { [symbol: string]: number } = {};
    // Initialize with transaction prices for the earliest date
    const earliestTransactions = allTransactions.filter(
      (tx) => new Date(tx.tx_date).toISOString().split("T")[0] === fromDate,
    );
    earliestTransactions.forEach((tx) => {
      lastKnownPrices[tx.asset_details.symbol] = tx.price_per_unit;
    });
    console.log(
      "Initial last known prices from transactions:",
      lastKnownPrices,
    );

    // Calculate and save aggregated history for missing or forced update days
    const newHistory = await Promise.all(
      datesToCalculate.map(async (date) => {
        console.log("Processing date:", date);
        const holdings = await calculateStockHoldings(allTransactions, date);
        console.log("Holdings calculated:", Object.keys(holdings).length);
        const stockPrices = await getStockPrices(holdings, date);
        console.log("Stock prices fetched for date", date, ":", stockPrices);

        let port_total_value;
        if (
          !stockPrices ||
          Object.values(stockPrices).every(
            (price) => price === 0 || price === undefined,
          )
        ) {
          console.warn(
            "No valid price data for date:",
            date,
            "Using last known prices",
          );
          // Use last known prices, ensuring non-zero values
          const fallbackPrices: { [symbol: string]: number } = {};
          for (const symbol in holdings) {
            fallbackPrices[symbol] =
              lastKnownPrices[symbol] ||
              allTransactions.find((tx) => tx.asset_details.symbol === symbol)
                ?.price_per_unit ||
              0;
          }
          port_total_value = calculatePortfolioValue(holdings, fallbackPrices);
          console.log(
            "Fallback value for",
            date,
            "using last known prices:",
            port_total_value,
          );
        } else {
          port_total_value = calculatePortfolioValue(holdings, stockPrices);
          // Update last known prices with current successful fetch, filtering out zeros
          Object.keys(stockPrices).forEach((symbol) => {
            if (stockPrices[symbol] > 0) {
              lastKnownPrices[symbol] = stockPrices[symbol];
            }
          });
          console.log("Updated last known prices:", lastKnownPrices);
        }

        const existing = await PortfolioHistory.findOne({
          portfolio_id: userId,
          port_history_date: new Date(date),
        });
        if (!existing) {
          const newHistoryEntry = new PortfolioHistory({
            portfolio_id: userId,
            port_history_date: new Date(date),
            port_total_value,
          });
          await newHistoryEntry.save();
          console.log("New history entry saved for date:", date);
          return newHistoryEntry;
        } else if (forceUpdate) {
          existing.port_total_value = port_total_value;
          await existing.save();
          console.log("Existing entry updated for date:", date);
          return existing;
        }
        return existing;
      }),
    );

    return NextResponse.json(
      { message: "Aggregated portfolio history updated", data: newHistory },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving aggregated portfolio history:" + error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
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
