// pages/api/portfolio-history/individual-save.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory";
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
      portfolio_id,
      fromDate,
      toDate,
      forceUpdate,
      userId: bodyUserId,
    } = await request.json();
    console.log("Received request body:", {
      portfolio_id,
      fromDate,
      toDate,
      forceUpdate,
      bodyUserId,
    });

    if (!portfolio_id || !fromDate || !toDate) {
      return NextResponse.json(
        { message: "portfolio_id, fromDate, and toDate are required" },
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
    console.log("Transactions fetched:", transactions.length);
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
    console.log(
      "Date range generated (capped at today):",
      allDates.length,
      "days",
      { fromDate, toDate, adjustedToDate },
    );

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
    console.log("Dates to calculate:", datesToCalculate.length);

    if (datesToCalculate.length === 0) {
      return NextResponse.json(
        { message: "No missing days to calculate" },
        { status: 200 },
      );
    }

    // Calculate and save individual history
    const newHistory = await Promise.all(
      datesToCalculate.map(async (date) => {
        console.log("Processing date:", date);
        const holdings = await calculateStockHoldings(transactions, date);
        console.log("Holdings calculated:", Object.keys(holdings).length);
        const stockPrices = await getStockPrices(
          holdings,
          fromDate,
          adjustedToDate,
        ); // Use range
        console.log(
          "Stock prices fetched for date",
          date,
          ":",
          stockPrices[date] || "N/A",
        );

        const port_total_value = calculatePortfolioValue(
          holdings,
          stockPrices[date] || {},
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
      { message: "Individual portfolio history updated", data: newHistory },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving individual portfolio history:" + error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
