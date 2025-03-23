import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Portfolio from "@/models/Portfolio";
import PortfolioAsset from "@/models/PortfolioAsset";
import PortfolioHistory from "@/models/PortfolioHistory";
import Report from "@/models/Report";
import Transaction from "@/models/Transaction";
import Watchlist from "@/models/Watchlist";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const userId = user._id;

    const portfolios = await Portfolio.find({ user_id: userId });
    const portfolioIds = portfolios.map((portfolio) => portfolio._id);

    await PortfolioAsset.deleteMany({ portfolio_id: { $in: portfolioIds } });

    await PortfolioHistory.deleteMany({ portfolio_id: { $in: portfolioIds } });

    await Transaction.deleteMany({ portfolio_id: { $in: portfolioIds } });

    await Report.deleteMany({ user_id: userId });

    await Portfolio.deleteMany({ user_id: userId });

    await Watchlist.deleteMany({ user_id: userId });

    await User.deleteOne({ _id: userId });

    return NextResponse.json(
      { message: "Account and all related data deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred while deleting the account",
      },
      { status: 500 },
    );
  }
}
