// Route to fetch individual portfolio history

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory";
import { IExtendedTransaction } from "@/types/Transaction";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTransactions } from "@/lib/transactions";
import Portfolio from "@/models/Portfolio";
import { getTodayDate, getDateRange } from "@/lib/utils";
import { Types } from "mongoose";

interface IndividualHistoryEntry {
  portfolio_id: string;
  port_history_date: Date;
  port_total_value: number;
}

export async function GET(request: Request) {
  await dbConnect();

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolio_id");
    const range = searchParams.get("range");

    if (!portfolioId || !Types.ObjectId.isValid(portfolioId)) {
      return NextResponse.json(
        { error: "Invalid or missing portfolio_id" },
        { status: 400 },
      );
    }

    // Verify portfolio ownership
    const portfolio = await Portfolio.findOne({
      _id: new Types.ObjectId(portfolioId),
      user_id: userId,
    });
    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found or unauthorized" },
        { status: 403 },
      );
    }

    // Fetch transactions for portfolio
    const transactions: IExtendedTransaction[] = (await getTransactions(
      portfolioId,
    )) as IExtendedTransaction[];

    if (transactions.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Find effective date range
    const earliestTransactionDate = new Date(
      Math.min(...transactions.map((tx) => new Date(tx.tx_date).getTime())),
    )
      .toISOString()
      .split("T")[0];
    const endDate = getTodayDate();

    let rangeStartDate: string;
    if (range) {
      const today = new Date(endDate);
      switch (range.toUpperCase()) {
        case "W":
          rangeStartDate = new Date(today.setDate(today.getDate() - 7))
            .toISOString()
            .split("T")[0];
          break;
        case "M":
          rangeStartDate = new Date(today.setMonth(today.getMonth() - 1))
            .toISOString()
            .split("T")[0];
          break;
        case "YTD":
          rangeStartDate = new Date(today.getFullYear(), 0, 1)
            .toISOString()
            .split("T")[0];
          break;
        case "Y":
          rangeStartDate = new Date(today.setFullYear(today.getFullYear() - 1))
            .toISOString()
            .split("T")[0];
          break;
        default:
          rangeStartDate = earliestTransactionDate;
      }
    } else {
      rangeStartDate = earliestTransactionDate;
    }

    const effectiveStartDate = range
      ? new Date(
          Math.max(
            new Date(rangeStartDate).getTime(),
            new Date(earliestTransactionDate).getTime(),
          ),
        )
          .toISOString()
          .split("T")[0]
      : earliestTransactionDate;

    const allDates = getDateRange(effectiveStartDate, endDate);

    // Check for missing historical entries
    const existingHistory = await PortfolioHistory.find({
      portfolio_id: new Types.ObjectId(portfolioId),
      port_history_date: {
        $gte: new Date(effectiveStartDate),
        $lte: new Date(endDate),
      },
    }).sort({ port_history_date: 1 });

    const existingDates = new Set(
      existingHistory.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );
    const missingDates = allDates
      .filter((date) => new Date(date) >= new Date(effectiveStartDate))
      .filter((date) => !existingDates.has(date));

    // Trigger save if missing dates
    if (missingDates.length > 0) {
      const response = await fetch(
        `${request.url.replace("/individual", "/individual-save")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolio_id: portfolioId,
            fromDate: effectiveStartDate,
            toDate: endDate,
            forceUpdate: false,
            userId,
          }),
        },
      );
      if (!response.ok) {
        const saveResult = await response.json();
        return NextResponse.json(
          { error: "Failed to save portfolio history", details: saveResult },
          { status: response.status },
        );
      }
    }

    // Fetch updated history
    const updatedHistory = await PortfolioHistory.find({
      portfolio_id: new Types.ObjectId(portfolioId),
      port_history_date: {
        $gte: new Date(effectiveStartDate),
        $lte: new Date(endDate),
      },
    }).sort({ port_history_date: 1 });

    // Aggregate history entries
    const individualHistory: IndividualHistoryEntry[] = [];
    const dateValues = new Map<string, number>();
    updatedHistory.forEach((entry) => {
      const dateStr = entry.port_history_date.toISOString().split("T")[0];
      const currentValue = dateValues.get(dateStr) || 0;
      dateValues.set(dateStr, currentValue + entry.port_total_value);
    });

    allDates.forEach((dateStr) => {
      if (new Date(dateStr) >= new Date(earliestTransactionDate)) {
        const existingValue = dateValues.get(dateStr) || 0;
        individualHistory.push({
          portfolio_id: portfolioId,
          port_history_date: new Date(dateStr),
          port_total_value: existingValue,
        });
      }
    });

    individualHistory.sort(
      (a, b) =>
        new Date(a.port_history_date).getTime() -
        new Date(b.port_history_date).getTime(),
    );

    return NextResponse.json({ data: individualHistory }, { status: 200 });
  } catch (error) {
    console.error("Error fetching individual portfolio history:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
