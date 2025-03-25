// pages/api/portfolio-history/aggregate.ts
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
    const session = await getServerSession(authOptions);
    console.log("Session checked in GET:", { session });
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.log("Unauthorized session in GET:", { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range");

    const portfolios = await Portfolio.find({ user_id: userId }).select("_id");
    console.log("Portfolios fetched for userId:", userId, portfolios);
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const portfolioIds = portfolios.map((portfolio) =>
      portfolio._id.toString(),
    );

    const allTransactions: IExtendedTransaction[] = [];
    for (const portfolio of portfolios) {
      const transactions = (await getTransactions(
        portfolio._id.toString(),
      )) as IExtendedTransaction[];
      allTransactions.push(...transactions);
    }
    console.log("Total transactions fetched:", allTransactions.length);

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
    console.log(
      "Effective start date:",
      effectiveStartDate,
      "Range start date:",
      rangeStartDate,
      "Earliest transaction date:",
      earliestTransactionDate,
    );

    const allDates = getDateRange(
      range ? rangeStartDate : effectiveStartDate,
      endDate,
    );

    const history = await PortfolioHistory.find({
      portfolio_id: { $in: portfolioIds },
      port_history_date: {
        $gte: new Date(effectiveStartDate),
        $lte: new Date(endDate),
      },
    }).sort({ port_history_date: 1 });

    const existingDates = new Set(
      history.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );
    const missingDates = allDates
      .filter((date) => new Date(date) >= new Date(effectiveStartDate))
      .filter((date) => !existingDates.has(date));

    if (missingDates.length > 0) {
      console.log("Triggering aggregate-save for missing dates:", missingDates);
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
      console.log("Aggregate-save response:", {
        status: response.status,
        statusText: response.statusText,
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Aggregate-save failed:", {
          status: response.status,
          errorText,
        });
      }
      const saveResult = await response.json();
      console.log("Aggregate-save result:", saveResult);

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
    } else {
      console.log("No missing dates to calculate, skipping aggregate-save");
    }

    const aggregatedHistory: AggregatedHistoryEntry[] = [];
    const dateValues = new Map<string, number>();
    history.forEach((entry) => {
      const dateStr = entry.port_history_date.toISOString().split("T")[0];
      const currentValue = dateValues.get(dateStr) || 0;
      dateValues.set(dateStr, currentValue + entry.port_total_value);
    });

    allDates.forEach((dateStr) => {
      if (range && new Date(dateStr) < new Date(earliestTransactionDate)) {
        aggregatedHistory.push({
          portfolio_id: userId,
          port_history_date: new Date(dateStr),
          port_total_value: 0,
        });
      } else {
        const existingValue = dateValues.get(dateStr) || 0;
        if (existingValue > 0 || !range) {
          aggregatedHistory.push({
            portfolio_id: userId,
            port_history_date: new Date(dateStr),
            port_total_value: existingValue,
          });
        }
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
