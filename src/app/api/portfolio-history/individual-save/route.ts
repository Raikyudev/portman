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

    // Fetch prices for the entire date range once
    const holdings = await calculateStockHoldings(transactions, fromDate);
    const stockPrices = await getStockPrices(
      holdings,
      fromDate,
      adjustedToDate,
    );

    // Calculate and save individual history
    const newHistory = await Promise.all(
      uniqueDatesToCalculate.map(async (date) => {
        const holdingsForDate = await calculateStockHoldings(
          transactions,
          date,
        );
        if (Object.keys(holdingsForDate).length === 0) {
          return null;
        }

        const pricesForDate = stockPrices[date] || {};
        if (Object.keys(pricesForDate).length === 0) {
          return null;
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
          return newHistoryEntry;
        } else if (forceUpdate) {
          existing.port_total_value = port_total_value || 0;
          await existing.save();
          return existing;
        }
        return existing;
      }),
    );

    const validNewHistory = newHistory.filter((entry) => entry !== null);
    return NextResponse.json(
      {
        message: "Individual portfolio history updated",
        data: validNewHistory,
      },
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
