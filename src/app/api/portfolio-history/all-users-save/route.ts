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

      const transactions = (await getTransactions(
        portfolioId,
      )) as IExtendedTransaction[];

      if (transactions.length === 0) {
        console.log("No transactions found for portfolioId:", portfolioId);
        continue;
      }

      console.log("Transactions fetched:", transactions.length, transactions);

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
        allDates,
      );

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
        datesToCalculate,
      );

      if (datesToCalculate.length === 0) {
        console.log("No missing days to calculate for portfolio:", portfolioId);
        continue;
      }

      const symbolEarliestDates = transactions.reduce(
        (acc, tx) => {
          const symbol = tx.asset_details.symbol;
          const txDate = new Date(tx.tx_date).toISOString().split("T")[0];
          if (!acc[symbol] || txDate < acc[symbol]) {
            acc[symbol] = txDate;
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      console.log("Earliest transaction dates by symbol:", symbolEarliestDates);

      const stockPrices: Record<string, Record<string, number>> = {};
      const newHistory = await Promise.all(
        datesToCalculate.map(async (date) => {
          console.log("Processing date for portfolio", portfolioId, ":", date);
          const holdingsForDate = await calculateStockHoldings(
            transactions,
            date,
          );
          console.log("Holdings for date", date, ":", holdingsForDate);

          if (Object.keys(holdingsForDate).length === 0) {
            console.log("No holdings found for date, skipping:", date);
            return null;
          }

          const symbolsToPrice = Object.keys(holdingsForDate);

          // Fetch prices only for this specific date if not already cached
          if (!stockPrices[date]) {
            stockPrices[date] = {};
            const symbolHoldings = Object.fromEntries(
              symbolsToPrice.map((symbol) => [symbol, holdingsForDate[symbol]]),
            );
            console.log(
              `Fetching prices for ${symbolsToPrice.join(", ")} on ${date}...`,
            );
            try {
              const newPrices = await getStockPrices(
                symbolHoldings,
                date, // Start date
                date, // End date (same as start, fetching only this date)
              );
              stockPrices[date] = newPrices[date] || {};
              console.log(`Prices for ${date}:`, stockPrices[date]);
            } catch (error) {
              console.error(
                `Error fetching prices for ${symbolsToPrice.join(", ")} on ${date}:`,
                error,
              );
            }
          }

          const pricesForDate = stockPrices[date] || {};
          console.log("Stock prices for", date, ":", pricesForDate);

          if (Object.keys(pricesForDate).length === 0) {
            console.log("No prices available for date, skipping:", date);
            return null;
          }

          const missingPricesForDate = symbolsToPrice.filter(
            (symbol) =>
              !pricesForDate.hasOwnProperty(symbol) ||
              pricesForDate[symbol] === 0,
          );
          if (missingPricesForDate.length > 0) {
            console.warn(
              `Missing or zero prices for symbols on ${date}:`,
              missingPricesForDate,
            );
          }

          const port_total_value = calculatePortfolioValue(
            holdingsForDate,
            pricesForDate,
          );
          console.log(
            "Calculated portfolio value for",
            date,
            ":",
            port_total_value,
            "with holdings:",
            holdingsForDate,
            "and prices:",
            pricesForDate,
          );

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
            "value:",
            port_total_value,
          );
          return newHistoryEntry;
        }),
      );

      overallResult = overallResult.concat(
        newHistory.filter((entry) => entry !== null),
      );
    }

    return NextResponse.json(
      {
        message: "Portfolio history updated for all portfolios",
        data: overallResult,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving portfolio history for all users:", error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
