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
    const range = searchParams.get("range"); // undefined if not provided

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

    // Determine the start date (earliest transaction date for this specific portfolio)
    const earliestTransactionDate = new Date(
      Math.min(...transactions.map((tx) => new Date(tx.tx_date).getTime())),
    )
      .toISOString()
      .split("T")[0];
    const endDate = getTodayDate();

    // Calculate the range start date based on the range parameter, or use earliestTransactionDate if undefined
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
          rangeStartDate = earliestTransactionDate; // Fallback to portfolio's earliest date for invalid range
      }
    } else {
      rangeStartDate = earliestTransactionDate; // Use this portfolio's earliest transaction date if no range
    }

    // Use the maximum of rangeStartDate and earliestTransactionDate only when range is defined
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
    console.log(
      "Effective start date:",
      effectiveStartDate,
      "Range start date:",
      rangeStartDate,
      "Earliest transaction date:",
      earliestTransactionDate,
    );

    // Generate all dates based on the appropriate start date
    const allDates = getDateRange(
      range ? rangeStartDate : effectiveStartDate,
      endDate,
    );

    // Get existing history for this portfolio
    const existingHistory = await PortfolioHistory.find({
      portfolio_id: new Types.ObjectId(portfolioId),
    }).sort({ port_history_date: 1 });
    const existingDates = new Set(
      existingHistory.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );

    // Identify missing dates only within the effective range
    const missingDates = allDates
      .filter((date) => new Date(date) >= new Date(effectiveStartDate))
      .filter((date) => !existingDates.has(date));
    console.log(
      "Missing dates to process for portfolio",
      portfolioId,
      ":",
      missingDates,
    );

    // Trigger POST to save missing history only if there are missing dates within the effective range
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
            fromDate: effectiveStartDate,
            toDate: endDate,
            forceUpdate: false,
            userId,
          }),
        },
      );

      const saveResult = await response.json();
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

    // Fetch updated history with the full requested range when range is defined, otherwise use effective start
    const updatedHistory = await PortfolioHistory.find({
      portfolio_id: new Types.ObjectId(portfolioId),
      port_history_date: {
        $gte: new Date(range ? rangeStartDate : effectiveStartDate),
        $lte: new Date(endDate),
      },
    }).sort({ port_history_date: 1 });

    // Aggregate history, including zeros for pre-transaction dates only when range is defined
    const individualHistory: IndividualHistoryEntry[] = [];
    const dateValues = new Map<string, number>();
    updatedHistory.forEach((entry) => {
      const dateStr = entry.port_history_date.toISOString().split("T")[0];
      const currentValue = dateValues.get(dateStr) || 0;
      dateValues.set(dateStr, currentValue + entry.port_total_value);
    });

    // Fill in zeros for pre-transaction dates only if range is defined
    allDates.forEach((dateStr) => {
      if (range && new Date(dateStr) < new Date(earliestTransactionDate)) {
        individualHistory.push({
          portfolio_id: portfolioId,
          port_history_date: new Date(dateStr),
          port_total_value: 0,
        });
      } else {
        const existingValue = dateValues.get(dateStr) || 0;
        if (existingValue > 0 || !range) {
          // Include only if value exists or no range is set
          individualHistory.push({
            portfolio_id: portfolioId,
            port_history_date: new Date(dateStr),
            port_total_value: existingValue,
          });
        }
      }
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
