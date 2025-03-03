// pages/api/portfolio-history/aggregate-save.ts
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

    let overallResult: IPortfolioHistory[] = [];

    // Process each portfolio
    for (const portfolio of portfolios) {
      const portfolioId = portfolio._id.toString();
      console.log("Processing portfolio:", portfolioId);

      // Fetch transactions for this portfolio
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

      // Determine the effective start date (earliest transaction or fromDate)
      const earliestTransactionDate = new Date(
        Math.min(...transactions.map((tx) => new Date(tx.tx_date).getTime())),
      )
        .toISOString()
        .split("T")[0];
      const effectiveFromDate =
        fromDate < earliestTransactionDate ? earliestTransactionDate : fromDate;
      console.log("Effective date range for portfolio", portfolioId, ":", {
        effectiveFromDate,
        adjustedToDate,
      });

      const allDates = getDateRange(effectiveFromDate, adjustedToDate);
      console.log(
        "Date range generated (capped at today) for portfolio",
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

      // Fetch prices for the entire date range once per portfolio
      const holdings = await calculateStockHoldings(
        transactions,
        effectiveFromDate,
      );
      console.log(
        "Holdings calculated for portfolio",
        portfolioId,
        ":",
        holdings,
      );
      const stockPrices = await getStockPrices(
        holdings,
        effectiveFromDate,
        adjustedToDate,
      );
      console.log(
        "Stock prices fetched for date range",
        effectiveFromDate,
        "to",
        adjustedToDate,
        ":",
        stockPrices,
      );

      // Calculate and save individual history
      const newHistory = await Promise.all(
        datesToCalculate.map(async (date) => {
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
            return null;
          }

          const pricesForDate = stockPrices[date] || {};
          console.log("Prices fetched for date:", {
            date,
            prices: pricesForDate,
          });

          if (Object.keys(pricesForDate).length === 0) {
            console.log("No prices available for date, skipping:", date);
            return null;
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
            console.log("New history entry saved for date:", date);
            return newHistoryEntry;
          } else if (forceUpdate) {
            existing.port_total_value = port_total_value || 0;
            await existing.save();
            console.log("Existing entry updated for date:", date);
            return existing;
          }
          return existing;
        }),
      );

      overallResult = overallResult.concat(
        newHistory.filter((entry) => entry !== null),
      );
    }

    return NextResponse.json(
      {
        message: "Portfolio history updated for all user portfolios",
        data: overallResult,
      },
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
