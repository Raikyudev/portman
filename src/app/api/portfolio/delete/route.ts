import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import PortfolioAsset from "@/models/PortfolioAsset";
import PortfolioHistory from "@/models/PortfolioHistory";
import Report from "@/models/Report";
import Transaction from "@/models/Transaction";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function DELETE(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user || !(session.user as { id?: string }).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("portfolioId");

  if (!portfolioId || !mongoose.Types.ObjectId.isValid(portfolioId)) {
    return NextResponse.json(
      { error: "Invalid portfolio ID" },
      { status: 400 },
    );
  }

  try {
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      user_id: userId,
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found or not owned by user" },
        { status: 404 },
      );
    }

    await Portfolio.deleteOne({ _id: portfolioId });

    await PortfolioAsset.deleteMany({ portfolio_id: portfolioId });

    await PortfolioHistory.deleteMany({ portfolio_id: portfolioId });

    await Report.updateMany(
      { portfolio_ids: portfolioId },
      { $pull: { portfolio_ids: portfolioId } },
    );

    await Transaction.deleteMany({ portfolio_id: portfolioId });

    await Report.deleteMany({ portfolio_ids: { $size: 0 } });

    return NextResponse.json(
      { message: "Portfolio and related data deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting portfolio:" + error);
    return NextResponse.json(
      { message: "Internal Server Error: " + error },
      { status: 500 },
    );
  }
}
