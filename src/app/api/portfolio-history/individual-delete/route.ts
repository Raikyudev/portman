// pages/api/portfolio-history/individual-delete/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Portfolio from "@/models/Portfolio";
import { Types } from "mongoose";

export async function DELETE(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    console.log("Session checked in DELETE:", { session });
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.log("Unauthorized session in DELETE:", { session });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolio_id");
    const dateStr = searchParams.get("date");

    if (!portfolioId || !Types.ObjectId.isValid(portfolioId)) {
      return NextResponse.json(
        { error: "Invalid or missing portfolio_id" },
        { status: 400 },
      );
    }

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: "Invalid or missing date (expected YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    // Convert the input date to a start and end of day for range matching
    const [year, month, day] = dateStr.split("-");
    const startOfDay = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0),
    );
    const endOfDay = new Date(
      Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        23,
        59,
        59,
        999,
      ),
    );

    // Verify portfolio ownership
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

    // Delete PortfolioHistory entries for the specified portfolio and date range
    const deleteResult = await PortfolioHistory.deleteMany({
      portfolio_id: new Types.ObjectId(portfolioId),
      port_history_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    console.log("Delete result:", deleteResult);

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { message: "No history entries found for the specified date" },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { message: `Deleted ${deleteResult.deletedCount} history entry(ies)` },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting individual portfolio history:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
