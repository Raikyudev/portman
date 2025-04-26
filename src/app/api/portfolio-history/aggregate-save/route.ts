// Route to calculate and saved aggregated portfolio history for a user

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory, { IPortfolioHistory } from "@/models/PortfolioHistory";
import {
  calculateStockHoldings,
  calculatePortfolioValue,
} from "@/lib/portfolioCalculations";
import { getStockPrices } from "@/lib/stockPrices";
import { IExtendedTransaction } from "@/types/Transaction";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTransactions } from "@/lib/transactions";
import Portfolio from "@/models/Portfolio";
import { getTodayDate, getDateRange } from "@/lib/utils";

export async function POST(request: Request) {
  await dbConnect();

  try {
    // Authenticate session
    const session = await getServerSession(authOptions);

    const {
      fromDate,
      toDate,
      forceUpdate,
      userId: bodyUserId,
    } = await request.json();

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { message: "fromDate and toDate are required" },
        { status: 400 },
      );
    }

    const userId = session?.user?.id || bodyUserId;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: No userId provided" },
        { status: 401 },
      );
    }

    // Find user portfolios
    const portfolios = await Portfolio.find({ user_id: userId }).select("_id");

    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json(
        { message: "No portfolios found" },
        { status: 404 },
      );
    }

    // Cap the toDate to today
    const today = getTodayDate();
    const adjustedToDate = toDate > today ? today : toDate;

    const overallResult: IPortfolioHistory[] = [];

    // Fetch all transactions across all portfolios
    const allTransactions: IExtendedTransaction[] = [];
    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();
      const transactions = await getTransactions(portfolioId);
      allTransactions.push(...transactions);
    }

    if (allTransactions.length === 0) {
      return NextResponse.json(
        { message: "No transactions found for user" },
        { status: 404 },
      );
    }

    // Find effective date range based on first transaction
    const earliestTransactionDate = new Date(
      Math.min(...allTransactions.map((tx) => new Date(tx.tx_date).getTime())),
    )
      .toISOString()
      .split("T")[0];
    const effectiveFromDate =
      fromDate < earliestTransactionDate ? earliestTransactionDate : fromDate;

    // Generate all dates between from and to dates
    const allDates = getDateRange(effectiveFromDate, adjustedToDate);

    // Map  symbols to their earliest transaction date
    const symbolEarliestDates = allTransactions.reduce(
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

    // Pre-fetch stock prices for all symbols
    const uniqueSymbols = new Set(
      allTransactions.map((tx) => tx.asset_details.symbol),
    );
    const stockPrices: Record<string, Record<string, number>> = {};
    for (const symbol of uniqueSymbols) {
      const startDate = symbolEarliestDates[symbol] || effectiveFromDate;

      try {
        const newPrices = await getStockPrices(
          { [symbol]: 0 },
          startDate,
          adjustedToDate,
          request,
        );
        for (const [newDate, prices] of Object.entries(newPrices)) {
          stockPrices[newDate] = stockPrices[newDate] || {};
          stockPrices[newDate][symbol] = prices[symbol] || 0;
        }
      } catch (error) {
        console.error(`Error fetching initial prices for ${symbol}:`, error);
      }
    }

    // Process each protfolio
    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();

      const transactions = (await getTransactions(
        portfolioId,
      )) as IExtendedTransaction[];

      if (transactions.length === 0) {
        continue;
      }

      // Check which dates need to be calculated
      const existingHistory = await PortfolioHistory.find({
        portfolio_id: portfolioId,
      }).sort({ port_history_date: 1 });
      const existingDates = new Set(
        existingHistory.map(
          (entry) => entry.port_history_date.toISOString().split("T")[0],
        ),
      );
      const datesToCalculate = forceUpdate
        ? allDates
        : allDates.filter((date) => !existingDates.has(date));

      if (datesToCalculate.length === 0) {
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

      // Calculate value for each missing day
      for (const date of datesToCalculate) {
        const holdingsForDate = await calculateStockHoldings(
          transactions,
          date,
        );

        if (Object.keys(holdingsForDate).length === 0) {
          continue;
        }

        const symbolsToPrice = Object.keys(holdingsForDate);
        // Fetch missing symbol prices if needed
        const missingSymbols = symbolsToPrice.filter(
          (symbol) =>
            !stockPrices[date] ||
            !stockPrices[date].hasOwnProperty(symbol) ||
            stockPrices[date][symbol] === 0,
        );

        if (missingSymbols.length > 0) {
          for (const symbol of missingSymbols) {
            const startDateForSymbol =
              symbolEarliestDates[symbol] || effectiveFromDate;

            try {
              const newPrices = await getStockPrices(
                { [symbol]: holdingsForDate[symbol] },
                startDateForSymbol,
                date,
                request,
              );
              for (const [newDate, prices] of Object.entries(newPrices)) {
                stockPrices[newDate] = stockPrices[newDate] || {};
                stockPrices[newDate][symbol] = prices[symbol] || 0;
              }
            } catch (error) {
              console.error(
                `Error fetching prices for ${symbol} on ${date}:`,
                error,
              );
            }
          }
        }

        const pricesForDate = stockPrices[date] || {};

        if (Object.keys(pricesForDate).length === 0) {
          continue;
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

        const existing = await PortfolioHistory.findOne({
          portfolio_id: portfolioId,
          port_history_date: new Date(date),
        });

        // Save or update history entry
        if (!existing) {
          const newHistoryEntry = new PortfolioHistory({
            portfolio_id: portfolioId,
            port_history_date: new Date(date),
            port_total_value: port_total_value || 0,
          });
          await newHistoryEntry.save();
          overallResult.push(newHistoryEntry);
        } else if (forceUpdate) {
          existing.port_total_value = port_total_value || 0;
          await existing.save();
          overallResult.push(existing);
        }
      }
    }

    return NextResponse.json(
      {
        message: "Portfolio history updated for all user portfolios",
        data: overallResult,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving aggregated portfolio history:", error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
