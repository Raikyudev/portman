import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const portfolios = await Portfolio.find({ user_id: userId }).select(
      "_id name description created_at",
    );

    return NextResponse.json({ portfolios }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user portfolios:", error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
