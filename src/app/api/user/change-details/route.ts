import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
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

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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

    const emailExists = await User.findOne({ email });
    if (emailExists && emailExists._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 },
      );
    }

    user.email = email;
    await user.save();

    return NextResponse.json(
      {
        message: "Email updated successfully",
        user: {
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          id: user._id,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred while updating email",
      },
      { status: 500 },
    );
  }
}
