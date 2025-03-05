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
    const session = await getServerSession(authOptions);

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

    // Verify the portfolio belongs to the user
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

    // Fetch transactions for the specific portfolio
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
    console.log("Generated allDates:", allDates); // Log to check for duplicates

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
    console.log("Dates to calculate:", datesToCalculate); // Log to check processed dates

    if (datesToCalculate.length === 0) {
      return NextResponse.json(
        { message: "No missing days to calculate" },
        { status: 200 },
      );
    }

    // Ensure uniqueness in datesToCalculate
    const uniqueDatesToCalculate = [...new Set(datesToCalculate)];
    if (uniqueDatesToCalculate.length !== datesToCalculate.length) {
      console.warn(
        "Duplicate dates detected, using unique set:",
        uniqueDatesToCalculate,
      );
    }

    // Initial fetch for all unique symbols in transactions
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

    const uniqueSymbols = new Set(
      transactions.map((tx) => tx.asset_details.symbol),
    );
    const stockPrices: Record<string, Record<string, number>> = {};
    for (const symbol of uniqueSymbols) {
      const startDate = symbolEarliestDates[symbol] || fromDate;
      console.log(
        `Initial fetch for ${symbol} from ${startDate} to ${adjustedToDate}...`,
      );
      try {
        const newPrices = await getStockPrices(
          { [symbol]: 0 },
          startDate,
          adjustedToDate,
        );
        for (const [newDate, prices] of Object.entries(newPrices)) {
          stockPrices[newDate] = stockPrices[newDate] || {};
          stockPrices[newDate][symbol] = prices[symbol] || 0;
          console.log(
            `Initial price for ${symbol} on ${newDate}: ${stockPrices[newDate][symbol]}`,
          );
        }
      } catch (error) {
        console.error(`Error fetching initial prices for ${symbol}:`, error);
      }
    }

    // Process dates sequentially to avoid race conditions
    const newHistory: IPortfolioHistory[] = [];
    for (const date of uniqueDatesToCalculate) {
      console.log("Processing date for portfolio", portfolio_id, ":", date);
      const holdingsForDate = await calculateStockHoldings(transactions, date);
      console.log("Holdings calculated for date:", {
        date,
        holdings: holdingsForDate,
      });

      if (Object.keys(holdingsForDate).length === 0) {
        console.log("No holdings found for date, skipping:", date);
        continue;
      }

      const symbolsToPrice = Object.keys(holdingsForDate);
      const missingSymbols = symbolsToPrice.filter(
        (symbol) =>
          !stockPrices[date] ||
          !stockPrices[date].hasOwnProperty(symbol) ||
          stockPrices[date][symbol] === 0,
      );
      console.log("Missing symbols for", date, ":", missingSymbols);

      if (missingSymbols.length > 0) {
        for (const symbol of missingSymbols) {
          const startDateForSymbol = symbolEarliestDates[symbol] || fromDate;
          console.log(
            `Fetching prices for ${symbol} from ${startDateForSymbol} to ${date}...`,
          );
          try {
            const newPrices = await getStockPrices(
              { [symbol]: holdingsForDate[symbol] },
              startDateForSymbol,
              date,
            );
            for (const [newDate, prices] of Object.entries(newPrices)) {
              stockPrices[newDate] = stockPrices[newDate] || {};
              stockPrices[newDate][symbol] = prices[symbol] || 0;
              console.log(
                `Updated price for ${symbol} on ${newDate}: ${stockPrices[newDate][symbol]}`,
              );
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
      console.log("Stock prices for", date, ":", pricesForDate);

      if (Object.keys(pricesForDate).length === 0) {
        console.log("No prices available for date, skipping:", date);
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
      console.log("Portfolio value for date", date, ":", port_total_value);

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
        console.log("New history entry saved for date:", date);
        newHistory.push(newHistoryEntry);
      } else if (forceUpdate) {
        existing.port_total_value = port_total_value || 0;
        await existing.save();
        console.log("Existing entry updated for date:", date);
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
