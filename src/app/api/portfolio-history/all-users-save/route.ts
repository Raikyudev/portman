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

config();

export async function POST(request: Request) {
  await dbConnect();

  try {
    const apiKey =
      request.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const expectedApiKey = process.env.PORT_HISTORY_KEY;

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API key" },
        { status: 401 },
      );
    }

    const portfolios = await Portfolio.find({}).select("_id user_id");
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json(
        { message: "No portfolios found" },
        { status: 404 },
      );
    }

    const allTransactionsByPortfolio: Record<string, IExtendedTransaction[]> =
      {};
    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();
      allTransactionsByPortfolio[portfolioId] =
        await getTransactions(portfolioId);
    }

    const allTransactions = Object.values(allTransactionsByPortfolio).flat();
    if (allTransactions.length === 0) {
      return NextResponse.json(
        { message: "No transactions found" },
        { status: 404 },
      );
    }

    const earliestTransactionDate = new Date(
      Math.min(...allTransactions.map((tx) => new Date(tx.tx_date).getTime())),
    )
      .toISOString()
      .split("T")[0];
    const endDate = getTodayDate();
    const allDates = getDateRange(earliestTransactionDate, endDate);

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

    const uniqueSymbols = new Set(
      allTransactions.map((tx) => tx.asset_details.symbol),
    );
    const stockPrices: Record<string, Record<string, number>> = {};
    for (const symbol of uniqueSymbols) {
      const startDate = symbolEarliestDates[symbol] || earliestTransactionDate;
      const newPrices = await getStockPrices(
        { [symbol]: 0 },
        startDate,
        endDate,
      );
      for (const [newDate, prices] of Object.entries(newPrices)) {
        stockPrices[newDate] = stockPrices[newDate] || {};
        stockPrices[newDate][symbol] = prices[symbol] || 0;
      }
    }

    const overallResult: IPortfolioHistory[] = [];
    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();
      const transactions = allTransactionsByPortfolio[portfolioId];

      if (transactions.length === 0) {
        continue;
      }

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

      if (datesToCalculate.length === 0) {
        continue;
      }

      for (const date of datesToCalculate) {
        const holdingsForDate = await calculateStockHoldings(
          transactions,
          date,
        );
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
            const startDateForSymbol =
              symbolEarliestDates[symbol] || earliestTransactionDate;
            const newPrices = await getStockPrices(
              { [symbol]: holdingsForDate[symbol] },
              startDateForSymbol,
              date,
            );
            for (const [newDate, prices] of Object.entries(newPrices)) {
              stockPrices[newDate] = stockPrices[newDate] || {};
              stockPrices[newDate][symbol] = prices[symbol] || 0;
            }
          }
        }

        const pricesForDate = stockPrices[date] || {};
        if (Object.keys(pricesForDate).length === 0) {
          continue;
        }

        const port_total_value = calculatePortfolioValue(
          holdingsForDate,
          pricesForDate,
        );

        const existing = await PortfolioHistory.findOne({
          portfolio_id: portfolioId,
          port_history_date: new Date(date),
        });
        if (!existing) {
          const newHistoryEntry = new PortfolioHistory({
            portfolio_id: portfolioId,
            port_history_date: new Date(date),
            port_total_value: port_total_value || 0,
          });
          await newHistoryEntry.save();
          overallResult.push(newHistoryEntry);
        } else {
          existing.port_total_value = port_total_value || 0;
          await existing.save();
          overallResult.push(existing);
        }
      }
    }

    return NextResponse.json(
      {
        message: "Portfolio history updated for all portfolios",
        data: overallResult,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
