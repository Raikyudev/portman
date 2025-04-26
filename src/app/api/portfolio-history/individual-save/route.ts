// Route to calculate and save individual portfolio history

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
    // Authenticate user
    const session = await getServerSession(authOptions);

    // Get parameters
    const {
      portfolio_id,
      fromDate,
      toDate,
      forceUpdate,
      userId: bodyUserId,
    } = await request.json();

    if (!portfolio_id || !fromDate || !toDate) {
      return NextResponse.json(
        { message: "portfolio_id, fromDate, and toDate are required" },
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

    // Verify ownership
    const portfolio = await Portfolio.findOne({
      _id: portfolio_id,
      user_id: userId,
    });
    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found or unauthorized" },
        { status: 403 },
      );
    }

    // Fetch transactions for portfolio
    const transactions = (await getTransactions(
      portfolio_id,
    )) as IExtendedTransaction[];
    if (transactions.length === 0) {
      return NextResponse.json(
        { message: "No transactions found" },
        { status: 404 },
      );
    }

    // Generate date range, capping at today
    const today = getTodayDate();
    const adjustedToDate = toDate > today ? today : toDate;
    const allDates = getDateRange(fromDate, adjustedToDate);

    // Fetch existing individual history
    const existingHistory = await PortfolioHistory.find({
      portfolio_id,
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
      return NextResponse.json(
        { message: "No missing days to calculate" },
        { status: 200 },
      );
    }

    const uniqueDatesToCalculate = [...new Set(datesToCalculate)];
    if (uniqueDatesToCalculate.length !== datesToCalculate.length) {
      console.warn(
        "Duplicate dates detected, using unique set:",
        uniqueDatesToCalculate,
      );
    }

    // Find earliest transaction per symbol
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

    // Pre-fetch stock prices for all symbols
    const uniqueSymbols = new Set(
      transactions.map((tx) => tx.asset_details.symbol),
    );
    const stockPrices: Record<string, Record<string, number>> = {};
    for (const symbol of uniqueSymbols) {
      const startDate = symbolEarliestDates[symbol] || fromDate;

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

    // Calculate and save history for each date
    const newHistory: IPortfolioHistory[] = [];
    for (const date of uniqueDatesToCalculate) {
      const holdingsForDate = await calculateStockHoldings(transactions, date);

      if (Object.keys(holdingsForDate).length === 0) {
        continue;
      }

      const symbolsToPrice = Object.keys(holdingsForDate);
      const missingSymbols = symbolsToPrice.filter(
        (symbol) =>
          !stockPrices[date] ||
          !stockPrices[date].hasOwnProperty(symbol) ||
          stockPrices[date][symbol] === 0,
      );

      if (missingSymbols.length > 0) {
        for (const symbol of missingSymbols) {
          const startDateForSymbol = symbolEarliestDates[symbol] || fromDate;
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
          !pricesForDate.hasOwnProperty(symbol) || pricesForDate[symbol] === 0,
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
        portfolio_id,
        port_history_date: new Date(date),
      });
      if (!existing) {
        const newHistoryEntry = new PortfolioHistory({
          portfolio_id,
          port_history_date: new Date(date),
          port_total_value: port_total_value || 0,
        });
        await newHistoryEntry.save();
        newHistory.push(newHistoryEntry);
      } else if (forceUpdate) {
        existing.port_total_value = port_total_value || 0;
        await existing.save();

        newHistory.push(existing);
      }
    }

    return NextResponse.json(
      {
        message: "Individual portfolio history updated",
        data: newHistory,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving individual portfolio history:", error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
