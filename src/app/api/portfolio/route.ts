import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("Fetching session...");
  const session = await getServerSession(authOptions);
  console.log("Session Data: ", session);

  if (!session || !session.user || !(session.user as { id?: string }).id) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const user = session.user;

  await dbConnect();
  const portfolios = await Portfolio.find({ user_id: user.id });

  return NextResponse.json(portfolios);
}
