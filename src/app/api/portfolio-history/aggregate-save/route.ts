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

    const userId = session?.user?.id || bodyUserId;
    console.log("Using userId:", userId);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: No userId provided" },
        { status: 401 },
      );
    }

    const portfolios = await Portfolio.find({ user_id: userId }).select("_id");
    console.log("Portfolios fetched:", portfolios);
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json(
        { message: "No portfolios found" },
        { status: 404 },
      );
    }

    const today = getTodayDate();
    const adjustedToDate = toDate > today ? today : toDate;

    const overallResult: IPortfolioHistory[] = [];

    const allTransactions: IExtendedTransaction[] = [];
    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();
      const transactions = await getTransactions(portfolioId);
      allTransactions.push(...transactions);
    }
    console.log("All transactions fetched:", allTransactions.length);

    if (allTransactions.length === 0) {
      console.log("No transactions found for user:", userId);
      return NextResponse.json(
        { message: "No transactions found for user" },
        { status: 404 },
      );
    }

    const earliestTransactionDate = new Date(
      Math.min(...allTransactions.map((tx) => new Date(tx.tx_date).getTime())),
    )
      .toISOString()
      .split("T")[0];
    const effectiveFromDate =
      fromDate < earliestTransactionDate ? earliestTransactionDate : fromDate;
    console.log("Effective date range for user:", {
      effectiveFromDate,
      adjustedToDate,
    });

    const allDates = getDateRange(effectiveFromDate, adjustedToDate);
    console.log(
      "Date range generated (capped at today):",
      allDates.length,
      "days",
    );

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
    console.log("Earliest transaction dates by symbol:", symbolEarliestDates);

    const uniqueSymbols = new Set(
      allTransactions.map((tx) => tx.asset_details.symbol),
    );
    const stockPrices: Record<string, Record<string, number>> = {};
    for (const symbol of uniqueSymbols) {
      const startDate = symbolEarliestDates[symbol] || effectiveFromDate;
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

    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();
      console.log("Processing portfolio:", portfolioId);

      const transactions = (await getTransactions(
        portfolioId,
      )) as IExtendedTransaction[];
      console.log("Transactions fetched for portfolio:", {
        portfolioId,
        length: transactions.length,
      });

      if (transactions.length === 0) {
        console.log("No transactions found for portfolio:", portfolioId);
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
      const datesToCalculate = forceUpdate
        ? allDates
        : allDates.filter((date) => !existingDates.has(date));
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

      for (const date of datesToCalculate) {
        console.log("Processing date for portfolio", portfolioId, ":", date);
        const holdingsForDate = await calculateStockHoldings(
          transactions,
          date,
        );
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
            const startDateForSymbol =
              symbolEarliestDates[symbol] || effectiveFromDate;
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
        console.log("Portfolio value for date", date, ":", port_total_value);

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
