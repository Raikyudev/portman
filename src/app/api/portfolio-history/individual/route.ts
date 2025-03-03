// pages/api/portfolio-history/individual/route.ts
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
    const session = await getServerSession(authOptions);
    console.log("Session checked in GET:", { session });
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.log("Unauthorized session in GET:", { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolio_id");

    if (!portfolioId || !Types.ObjectId.isValid(portfolioId)) {
      return NextResponse.json(
        { error: "Invalid or missing portfolio_id" },
        { status: 400 },
      );
    }

    const portfolio = await Portfolio.findOne({
      _id: new Types.ObjectId(portfolioId),
      user_id: userId,
    });
    console.log("Portfolio fetched for portfolioId:", portfolioId, portfolio);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found or unauthorized" },
        { status: 403 },
      );
    }

    // Fetch transactions for the specific portfolio
    const transactions: IExtendedTransaction[] = (await getTransactions(
      portfolioId,
    )) as IExtendedTransaction[];
    console.log(
      "Transactions fetched for portfolioId:",
      portfolioId,
      transactions.length,
    );

    if (transactions.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Determine the start date (earliest transaction date for this portfolio)
    const earliestTransactionDate = new Date(
      Math.min(...transactions.map((tx) => new Date(tx.tx_date).getTime())),
    )
      .toISOString()
      .split("T")[0];
    const endDate = getTodayDate();
    const allDates = getDateRange(earliestTransactionDate, endDate);

    // Get existing dates to identify missing ones
    const existingHistory = await PortfolioHistory.find({
      portfolio_id: new Types.ObjectId(portfolioId),
    }).sort({ port_history_date: 1 });
    const existingDates = new Set(
      existingHistory.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );
    const missingDates = allDates.filter((date) => !existingDates.has(date));
    console.log("Missing dates to process:", missingDates);

    // Trigger POST to save missing history only if there are missing dates
    if (missingDates.length > 0) {
      console.log(
        "Triggering individual-save for missing dates:",
        missingDates,
      );
      const response = await fetch(
        `${request.url.replace("/individual", "/individual-save")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolio_id: portfolioId,
            fromDate: earliestTransactionDate,
            toDate: endDate,
            forceUpdate: false,
            userId,
          }),
        },
      );

      const saveResult = await response.json(); // Read body once
      console.log("Individual-save response:", {
        status: response.status,
        result: saveResult,
      });
      if (!response.ok) {
        console.error("Individual-save failed:", saveResult);
        return NextResponse.json(
          { error: "Failed to save portfolio history", details: saveResult },
          { status: response.status },
        );
      }
    } else {
      console.log("No missing dates to calculate for portfolio:", portfolioId);
    }

    // Fetch updated history
    const updatedHistory = await PortfolioHistory.find({
      portfolio_id: new Types.ObjectId(portfolioId),
    }).sort({ port_history_date: 1 });

    // Aggregate history for the individual portfolio
    const individualHistory: IndividualHistoryEntry[] = [];
    const dateValues = new Map<string, number>();
    updatedHistory.forEach((entry) => {
      const dateStr = entry.port_history_date.toISOString().split("T")[0];
      const currentValue = dateValues.get(dateStr) || 0;
      dateValues.set(dateStr, currentValue + entry.port_total_value);
    });

    dateValues.forEach((totalValue, dateStr) => {
      individualHistory.push({
        portfolio_id: portfolioId,
        port_history_date: new Date(dateStr),
        port_total_value: totalValue,
      });
    });

    // Sort by date
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
