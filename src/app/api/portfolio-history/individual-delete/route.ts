// Route for deleting portfolio history from a given date to today
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
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
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

    // Convert the input date to the start of the specified day
    const [year, month, day] = dateStr.split("-");
    const startOfDay = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0),
    );

    const endOfDay = new Date();

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

    // Delete history entries
    const deleteResult = await PortfolioHistory.deleteMany({
      portfolio_id: new Types.ObjectId(portfolioId),
      port_history_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        {
          message: "No history entries found from the specified date to today",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        message: `Deleted ${deleteResult.deletedCount} history entry(ies) from ${dateStr} to today`,
      },
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
