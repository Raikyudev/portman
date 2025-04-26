// route for aggregated portfolio history for a user

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory";
import { IExtendedTransaction } from "@/types/Transaction";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTransactions } from "@/lib/transactions";
import Portfolio from "@/models/Portfolio";
import { cookies } from "next/headers";
import { getDateRange, getTodayDate } from "@/lib/utils";

interface AggregatedHistoryEntry {
  portfolio_id: string;
  port_history_date: Date;
  port_total_value: number;
}

export async function GET(request: Request) {
  await dbConnect();

  try {
    // Authenticate session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range");

    // Find user's portfolios
    const portfolios = await Portfolio.find({ user_id: userId }).select("_id");
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const portfolioIds = portfolios.map((portfolio) =>
      portfolio._id.toString(),
    );

    // Fetch all transactions across all portfolios
    const allTransactions: IExtendedTransaction[] = [];
    for (const portfolio of portfolios) {
      const transactions = (await getTransactions(
        portfolio._id.toString(),
      )) as IExtendedTransaction[];
      allTransactions.push(...transactions);
    }

    // Find earliest transaction date
    const earliestTransactionDate =
      allTransactions.length > 0
        ? new Date(
            Math.min(
              ...allTransactions.map((tx) => new Date(tx.tx_date).getTime()),
            ),
          )
            .toISOString()
            .split("T")[0]
        : getTodayDate();
    const endDate = getTodayDate();

    // Find start date based on requested range
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

    // Start date considering range and earliest transaction
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

    // Generate list of all dates in the range
    const allDates = getDateRange(effectiveStartDate, endDate);

    // Fetch portfolio history for the user
    const history = await PortfolioHistory.find({
      portfolio_id: { $in: portfolioIds },
      port_history_date: {
        $gte: new Date(effectiveStartDate),
        $lte: new Date(endDate),
      },
    }).sort({ port_history_date: 1 });

    // Find missing dates not yet calculated
    const existingDates = new Set(
      history.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );
    const missingDates = allDates
      .filter((date) => new Date(date) >= new Date(effectiveStartDate))
      .filter((date) => !existingDates.has(date));

    // If missing dates exist, call /aggregate-save
    if (missingDates.length > 0) {
      const cookie = (await cookies()).get("next-auth.session-token");
      const response = await fetch(
        `${request.url.replace("/aggregate", "/aggregate-save")}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie ? `${cookie.name}=${cookie.value}` : "",
          },
          body: JSON.stringify({
            fromDate: effectiveStartDate,
            toDate: endDate,
            forceUpdate: false,
            userId: userId,
          }),
        },
      );

      // Refresh history if saved correctly
      if (response.ok) {
        const updatedHistory = await PortfolioHistory.find({
          portfolio_id: { $in: portfolioIds },
          port_history_date: {
            $gte: new Date(effectiveStartDate),
            $lte: new Date(endDate),
          },
        }).sort({ port_history_date: 1 });
        history.push(
          ...updatedHistory.filter(
            (entry) =>
              !existingDates.has(
                entry.port_history_date.toISOString().split("T")[0],
              ),
          ),
        );
      }
    }

    // Aggregate total portfolio value by date
    const aggregatedHistory: AggregatedHistoryEntry[] = [];
    const dateValues = new Map<string, number>();
    history.forEach((entry) => {
      const dateStr = entry.port_history_date.toISOString().split("T")[0];
      const currentValue = dateValues.get(dateStr) || 0;
      dateValues.set(dateStr, currentValue + entry.port_total_value);
    });

    // Create final response only including dates after first transaction
    allDates.forEach((dateStr) => {
      if (new Date(dateStr) >= new Date(earliestTransactionDate)) {
        const existingValue = dateValues.get(dateStr) || 0;
        aggregatedHistory.push({
          portfolio_id: userId,
          port_history_date: new Date(dateStr),
          port_total_value: existingValue,
        });
      }
    });

    // Sort by date
    aggregatedHistory.sort(
      (a, b) =>
        new Date(a.port_history_date).getTime() -
        new Date(b.port_history_date).getTime(),
    );

    return NextResponse.json({ data: aggregatedHistory }, { status: 200 });
  } catch (error) {
    console.error("Error fetching aggregated portfolio history:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
