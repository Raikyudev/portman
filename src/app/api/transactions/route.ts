import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getTransactions } from "@/lib/transactions"; // Adjust import path
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust import path
import Portfolio from "@/models/Portfolio";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolio_id");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;

    let portfolioIds: string[];

    if (portfolioId) {
      const portfolio = await Portfolio.findOne({
        _id: portfolioId,
        user_id: userId,
      });
      if (!portfolio) {
        return NextResponse.json(
          { error: "Portfolio not found or unauthorized" },
          { status: 404 },
        );
      }
      portfolioIds = [portfolioId];
    } else {
      const portfolios = await Portfolio.find({ user_id: userId }).select(
        "_id",
      );
      if (!portfolios || portfolios.length === 0) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
      portfolioIds = portfolios.map((portfolio) => portfolio._id.toString());
    }

    const allTransactions = [];
    for (const pid of portfolioIds) {
      const transactions = await getTransactions(pid);
      console.log(
        `Transactions fetched for portfolio ${pid}:`,
        transactions.length,
      );
      allTransactions.push(...transactions);
    }

    console.log(
      "Total transactions fetched:",
      allTransactions.length,
      "for portfolios:",
      portfolioIds,
    );

    const effectiveLimit =
      limit !== undefined
        ? Math.min(limit, allTransactions.length)
        : allTransactions.length;
    if (limit !== undefined && effectiveLimit < 0) {
      return NextResponse.json(
        { error: "Invalid limit parameter" },
        { status: 400 },
      );
    }

    const recentTransactions = allTransactions
      .sort(
        (a, b) => new Date(b.tx_date).getTime() - new Date(a.tx_date).getTime(),
      )
      .slice(0, effectiveLimit);

    const formattedTransactions = recentTransactions.map((tx) => ({
      date: tx.tx_date.toISOString().split("T")[0],
      symbol: tx.asset_details.symbol,
      type: tx.tx_type,
      quantity: tx.quantity,
      price: tx.price_per_unit,
      total: tx.quantity * tx.price_per_unit,
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
      { message: "Internal Server Error: " + error },
      { status: 500 },
    );
  }
}
