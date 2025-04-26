// Update portfolio name and description route

import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { portfolioId, name, description } = await request.json();

    if (!portfolioId || !name) {
      return NextResponse.json(
        { error: "Portfolio ID and name are required" },
        { status: 400 },
      );
    }

    // Find portfolio and check ownership
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      user_id: session.user.id,
    });
    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found or not owned by user" },
        { status: 404 },
      );
    }

    // Update portfolio details
    portfolio.name = name;
    portfolio.description = description || "";
    await portfolio.save();

    return NextResponse.json(
      {
        message: "Portfolio updated successfully",
        portfolio: {
          _id: portfolio._id,
          name: portfolio.name,
          description: portfolio.description,
          created_at: portfolio.created_at,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred while updating portfolio",
      },
      { status: 500 },
    );
  }
}
