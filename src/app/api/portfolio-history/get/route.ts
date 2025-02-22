import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import PortfolioHistory from "@/models/PortfolioHistory";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const portfolio_id = searchParams.get("portfolio_id");

    if (!portfolio_id) {
      return NextResponse.json(
        { message: "Portfolio ID is required" },
        { status: 400 },
      );
    }

    const history = await PortfolioHistory.find({ portfolio_id }).sort({
      port_history_date: -1,
    });

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error) {
    console.error("Error fetching portfolio history:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
