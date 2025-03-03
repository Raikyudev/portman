// src/app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getTransactions } from "@/lib/transactions"; // Adjust import path
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust import path
import Portfolio from "@/models/Portfolio"; // Adjust import path

export async function GET(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all portfolio IDs for the user
    const portfolios = await Portfolio.find({ user_id: userId }).select("_id");
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const portfolioIds = portfolios.map((portfolio) =>
      portfolio._id.toString(),
    );

    // Fetch transactions for all portfolios
    const allTransactions = [];
    for (const portfolioId of portfolioIds) {
      const transactions = await getTransactions(portfolioId);
      allTransactions.push(...transactions);
    }

    console.log(
      "Total transactions fetched across all portfolios:",
      allTransactions.length,
    );

    // Get the limit parameter (default to all if not provided)
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : allTransactions.length;

    // Validate limit
    const effectiveLimit = Math.min(limit, allTransactions.length); // Ensure limit doesn't exceed available transactions
    if (effectiveLimit < 0) {
      return NextResponse.json(
        { error: "Invalid limit parameter" },
        { status: 400 },
      );
    }

    // Sort by tx_date in descending order and limit to the specified number
    const recentTransactions = allTransactions
      .sort(
        (a, b) => new Date(b.tx_date).getTime() - new Date(a.tx_date).getTime(),
      )
      .slice(0, effectiveLimit);

    // Map to the expected format with calculated total
    const formattedTransactions = recentTransactions.map((tx) => ({
      date: tx.tx_date.toISOString().split("T")[0],
      symbol: tx.asset_details.symbol,
      type: tx.tx_type,
      quantity: tx.quantity,
      price: tx.price_per_unit,
      total: tx.quantity * tx.price_per_unit, // Calculate total
    }));

    console.log(
      "Fetched recent transactions with limit",
      limit,
      ":",
      formattedTransactions,
    );
    return NextResponse.json({ data: formattedTransactions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
