// pages/api/portfolio-history/individual.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory";
import { IExtendedTransaction } from "@/types/Transaction"; // Adjust import path
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust import path
import { getTransactions } from "@/lib/transactions"; // Adjust import path
import Portfolio from "@/models/Portfolio";
import { cookies } from "next/headers"; // Adjust import path

export async function GET(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolio_id = searchParams.get("portfolio_id");

    if (!portfolio_id) {
      return NextResponse.json(
        { message: "Portfolio ID is required" },
        { status: 400 },
      );
    }

    // Verify the portfolio belongs to the user
    const portfolio = await Portfolio.findOne({
      _id: portfolio_id,
      user_id: session.user.id,
    });
    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found or unauthorized" },
        { status: 403 },
      );
    }

    // Fetch existing history for the specific portfolio
    let history = await PortfolioHistory.find({ portfolio_id }).sort({
      port_history_date: 1, // Ascending order for chronological history
    });

    // Fetch transactions for the specific portfolio
    const transactions = (await getTransactions(
      portfolio_id,
    )) as IExtendedTransaction[];
    if (transactions.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Determine the start date (earliest transaction date)
    const earliestTransactionDate = new Date(
      Math.min(...transactions.map((tx) => new Date(tx.tx_date).getTime())),
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

    // Trigger POST to save missing history if any
    if (missingDates.length > 0) {
      console.log(
        "Triggering individual-save for missing dates:",
        missingDates,
      );
      const cookie = (await cookies()).get("next-auth.session-token"); // Get the session token
      const response = await fetch(
        `${request.url.replace("/individual", "/individual-save")}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie ? `${cookie.name}=${cookie.value}` : "", // Manually set the cookie
          },
          body: JSON.stringify({
            portfolio_id,
            fromDate: earliestTransactionDate,
            toDate: endDate,
            forceUpdate: false,
            userId: session.user.id,
          }),
        },
      );
      console.log("Individual-save response:", {
        status: response.status,
        statusText: response.statusText,
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Individual-save failed:", {
          status: response.status,
          errorText,
        });
      }
      const saveResult = await response.json();
      console.log("Individual-save result:", saveResult);

      // Refetch history after saving
      history = await PortfolioHistory.find({ portfolio_id }).sort({
        port_history_date: 1,
      });
    }

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error) {
    console.error("Error fetching individual portfolio history:" + error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Helper function to generate date range
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}
