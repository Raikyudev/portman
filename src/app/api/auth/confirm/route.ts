import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  await dbConnect();

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Invalid or missing token" },
      { status: 400 },
    );
  }

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirmed`,
      302,
    );
  } catch (error) {
    console.error("Error confirming email:", error);
    return NextResponse.json(
      { error: "Error confirming email" },
      { status: 500 },
    );
  }
}
