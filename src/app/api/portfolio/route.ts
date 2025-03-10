import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("Fetching session...");
  const session = await getServerSession(authOptions);
  console.log("Session Data: ", session);

  if (!session || !session.user || !(session.user as { id?: string }).id) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const user = session.user;
  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("id");

  await dbConnect();
  const portfolios = await Portfolio.find({ user_id: user.id });

  // If portfolioId is provided, include it in the response
  if (portfolioId) {
    return NextResponse.json({
      portfolios,
      portfolioId,
    });
  }

  // If no portfolioId, just return the portfolios array
  return NextResponse.json(portfolios);
}
