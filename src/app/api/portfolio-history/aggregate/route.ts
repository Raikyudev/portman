// pages/api/portfolio-history/aggregate.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory"; // Adjust import
import { IExtendedTransaction } from "@/types/Transaction"; // Adjust import path
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust import path
import { getTransactions } from "@/lib/transactions"; // Adjust import path
import Portfolio from "@/models/Portfolio"; // Adjust import path
import { cookies } from "next/headers";
import { getDateRange } from "@/lib/utils";

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

    // Fetch all portfolios for the user to get portfolio IDs
    const portfolios = await Portfolio.find({ user_id: userId }).select("_id");
    console.log("Portfolios fetched for userId:", userId, portfolios);
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Extract portfolio IDs
    const portfolioIds = portfolios.map((portfolio) =>
      portfolio._id.toString(),
    );

    // Fetch existing history for all portfolios
    const history = await PortfolioHistory.find({
      portfolio_id: { $in: portfolioIds },
    }).sort({ port_history_date: 1 }); // Aggregate history across all portfolios

    // Fetch transactions for all portfolios
    const allTransactions: IExtendedTransaction[] = [];
    for (const portfolio of portfolios) {
      const transactions = (await getTransactions(
        portfolio._id.toString(),
      )) as IExtendedTransaction[];
      allTransactions.push(...transactions);
    }

    console.log("Total transactions fetched:", allTransactions.length);
    if (allTransactions.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Determine the start date (earliest transaction date across all portfolios)
    const earliestTransactionDate = new Date(
      Math.min(...allTransactions.map((tx) => new Date(tx.tx_date).getTime())),
    )
      .toISOString()
      .split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];
    const allDates = getDateRange(earliestTransactionDate, endDate);

    // Get existing dates to identify missing ones
    const existingDates = new Set(
      history.map(
        (entry) => entry.port_history_date.toISOString().split("T")[0],
      ),
    );
    const missingDates = allDates.filter((date) => !existingDates.has(date));

    // Trigger POST to save missing history only if there are missing dates
    if (missingDates.length > 0) {
      console.log("Triggering aggregate-save for missing dates:", missingDates);
      const cookie = (await cookies()).get("next-auth.session-token"); // Get the session token
      const response = await fetch(
        `${request.url.replace("/aggregate", "/aggregate-save")}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie ? `${cookie.name}=${cookie.value}` : "", // Manually set the cookie
          },
          body: JSON.stringify({
            fromDate: earliestTransactionDate,
            toDate: endDate,
            forceUpdate: false,
            userId: userId, // Pass userId for validation
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

      // Refetch history after saving
      const updatedHistory = await PortfolioHistory.find({
        portfolio_id: { $in: portfolioIds },
      }).sort({ port_history_date: 1 });
      history.push(...updatedHistory); // Combine with existing history (deduplication handled by Set below)
    } else {
      console.log("No missing dates to calculate, skipping aggregate-save");
    }

    // Aggregate history by date (sum port_total_value across portfolios for each date)
    const aggregatedHistory: AggregatedHistoryEntry[] = [];
    const dateValues = new Map<string, number>();
    history.forEach((entry) => {
      const dateStr = entry.port_history_date.toISOString().split("T")[0];
      const currentValue = dateValues.get(dateStr) || 0;
      dateValues.set(dateStr, currentValue + entry.port_total_value);
    });

    dateValues.forEach((totalValue, dateStr) => {
      aggregatedHistory.push({
        portfolio_id: userId, // Use userId for aggregated data
        port_history_date: new Date(dateStr),
        port_total_value: totalValue,
      });
    });

    // Sort by date
    aggregatedHistory.sort(
      (a, b) =>
        new Date(a.port_history_date).getTime() -
        new Date(b.port_history_date).getTime(),
    );

    return NextResponse.json({ data: aggregatedHistory }, { status: 200 });
  } catch (error) {
    console.error("Error fetching aggregated portfolio history:" + error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
