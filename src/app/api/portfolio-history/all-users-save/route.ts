// pages/api/portfolio-history/all-users.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory, { IPortfolioHistory } from "@/models/PortfolioHistory";
import {
  calculateStockHoldings,
  calculatePortfolioValue,
} from "@/lib/portfolioCalculations";
import { getStockPrices } from "@/lib/stockPrices";
import { IExtendedTransaction } from "@/types/Transaction"; // Adjust import path
import { getTransactions } from "@/lib/transactions"; // Adjust import path
import Portfolio from "@/models/Portfolio"; // Adjust import path
import { getTodayDate } from "@/lib/utils"; // Hypothetical utility function
import { config } from "dotenv";

config(); // Load environment variables from .env.local

export async function POST(request: Request) {
  await dbConnect();

  try {
    // Extract API key from headers
    const apiKey =
      request.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const expectedApiKey = process.env.PORT_HISTORY_KEY;

    console.log("Received API Key:", apiKey);
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      console.log("Invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized: Invalid API key" },
        { status: 401 },
      );
    }

    console.log("API key validated successfully");

    // Fetch all portfolios
    const portfolios = await Portfolio.find({}).select("_id user_id");
    console.log("Total portfolios fetched:", portfolios.length);
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json(
        { message: "No portfolios found" },
        { status: 404 },
      );
    }

    // Group portfolios by user_id
    const users = [...new Set(portfolios.map((p) => p.user_id))];
    console.log("Unique users found:", users.length);

    let overallResult: IPortfolioHistory[] = [];

    for (const userId of users) {
      console.log("Processing history for userId:", userId);

      // Fetch transactions for all portfolios of this user
      const userPortfolios = portfolios.filter((p) => p.user_id === userId);
      const allTransactions: IExtendedTransaction[] = [];
      for (const portfolio of userPortfolios) {
        const transactions = (await getTransactions(
          portfolio._id.toString(),
        )) as IExtendedTransaction[];
        allTransactions.push(...transactions);
      }

      if (allTransactions.length === 0) {
        console.log("No transactions found for userId:", userId);
        continue;
      }

      // Determine the start date (earliest transaction date across all portfolios)
      const earliestTransactionDate = new Date(
        Math.min(
          ...allTransactions.map((tx) => new Date(tx.tx_date).getTime()),
        ),
      )
        .toISOString()
        .split("T")[0];
      const endDate = getTodayDate();
      const allDates = getDateRange(earliestTransactionDate, endDate);
      console.log("Date range for user", userId, ":", allDates.length, "days");

      // Fetch existing aggregated history for this user
      const existingHistory = await PortfolioHistory.find({
        portfolio_id: userId,
      }).sort({ port_history_date: 1 });
      const existingDates = new Set(
        existingHistory.map(
          (entry) => entry.port_history_date.toISOString().split("T")[0],
        ),
      );
      const datesToCalculate = allDates.filter(
        (date) => !existingDates.has(date),
      );
      console.log(
        "Dates to calculate for user",
        userId,
        ":",
        datesToCalculate.length,
      );

      if (datesToCalculate.length === 0) {
        console.log("No missing days to calculate for user:", userId);
        continue;
      }

      // Track last known prices
      const lastKnownPrices: { [symbol: string]: number } = {};
      // Initialize with transaction prices for the earliest date
      const earliestTransactions = allTransactions.filter(
        (tx) =>
          new Date(tx.tx_date).toISOString().split("T")[0] ===
          earliestTransactionDate,
      );
      earliestTransactions.forEach((tx) => {
        lastKnownPrices[tx.asset_details.symbol] = tx.price_per_unit;
      });
      console.log(
        "Initial last known prices for user",
        userId,
        ":",
        lastKnownPrices,
      );

      // Calculate and save aggregated history for this user
      const newHistory = await Promise.all(
        datesToCalculate.map(async (date) => {
          console.log("Processing date for user", userId, ":", date);
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
            port_total_value = calculatePortfolioValue(
              holdings,
              fallbackPrices,
            );
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
            console.log(
              "Updated last known prices for user",
              userId,
              ":",
              lastKnownPrices,
            );
          }

          const newHistoryEntry = new PortfolioHistory({
            portfolio_id: userId,
            port_history_date: new Date(date),
            port_total_value,
          });
          await newHistoryEntry.save();
          console.log(
            "New history entry saved for user",
            userId,
            "date:",
            date,
          );
          return newHistoryEntry;
        }),
      );

      overallResult = overallResult.concat(newHistory);
    }

    return NextResponse.json(
      {
        message: "Portfolio history updated for all users",
        data: overallResult,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving portfolio history for all users:" + error);
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
