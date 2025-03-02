// pages/api/portfolio-history/all-users.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory, { IPortfolioHistory } from "@/models/PortfolioHistory";
import {
  calculateStockHoldings,
  calculatePortfolioValue,
} from "@/lib/portfolioCalculations";
import { getStockPrices } from "@/lib/stockPrices";
import { IExtendedTransaction } from "@/types/Transaction";
import { getTransactions } from "@/lib/transactions";
import Portfolio from "@/models/Portfolio";
import { getTodayDate, getDateRange } from "@/lib/utils";
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

    console.log("Unique portfolios found:", portfolios.length);

    let overallResult: IPortfolioHistory[] = [];

    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();
      console.log("Processing history for portfolioId:", portfolioId);

      // Fetch transactions for this portfolio
      const transactions = (await getTransactions(
        portfolioId,
      )) as IExtendedTransaction[];

      if (transactions.length === 0) {
        console.log("No transactions found for portfolioId:", portfolioId);
        continue;
      }

      // Determine the start date (earliest transaction date)
      const earliestTransactionDate = new Date(
        Math.min(...transactions.map((tx) => new Date(tx.tx_date).getTime())),
      )
        .toISOString()
        .split("T")[0];
      const endDate = getTodayDate();
      const allDates = getDateRange(earliestTransactionDate, endDate);
      console.log(
        "Date range for portfolio",
        portfolioId,
        ":",
        allDates.length,
        "days",
      );

      // Fetch existing history for this portfolio
      const existingHistory = await PortfolioHistory.find({
        portfolio_id: portfolioId,
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
        "Dates to calculate for portfolio",
        portfolioId,
        ":",
        datesToCalculate.length,
      );

      if (datesToCalculate.length === 0) {
        console.log("No missing days to calculate for portfolio:", portfolioId);
        continue;
      }

      // Calculate and save history for this portfolio
      const newHistory = await Promise.all(
        datesToCalculate.map(async (date) => {
          console.log("Processing date for portfolio", portfolioId, ":", date);
          const holdings = await calculateStockHoldings(transactions, date);
          console.log("Holdings calculated:", holdings);
          const stockPrices = await getStockPrices(
            holdings,
            earliestTransactionDate,
            endDate,
          ); // Use range
          console.log(
            "Stock prices fetched for date range",
            earliestTransactionDate,
            "to",
            endDate,
            ":",
            stockPrices[date] || "N/A",
          );

          const port_total_value = calculatePortfolioValue(
            holdings,
            stockPrices[date] || {},
          );
          console.log("Portfolio value for date", date, ":", port_total_value);

          const newHistoryEntry = new PortfolioHistory({
            portfolio_id: portfolioId,
            port_history_date: new Date(date),
            port_total_value,
          });
          await newHistoryEntry.save();
          console.log(
            "New history entry saved for portfolio",
            portfolioId,
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
        message: "Portfolio history updated for all portfolios",
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
