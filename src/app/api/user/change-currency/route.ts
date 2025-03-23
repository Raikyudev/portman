import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currency } = await request.json();

    if (!currency) {
      return NextResponse.json(
        { error: "Currency is required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.preferences.currency = currency;
    await user.save();

    return NextResponse.json(
      {
        message: "Currency updated successfully",
        user: {
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          id: user._id,
          preferences: user.preferences,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred while updating currency",
      },
      { status: 500 },
    );
  }
}
