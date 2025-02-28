import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 587,
  secure: false,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { email } = await request.json();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "No user found with that email" },
        { status: 404 },
      );
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: "no-reply@portman-demo.tech",
      to: email,
      subject: "Password Reset Request",
      text: `Click this link to reset your password: ${resetLink}`,
      html: `<p>Click <a href="${resetLink}">this link</a> to reset your password. The link expires in 24 hours.</p>`,
    });

    return NextResponse.json(
      { message: "Password reset link sent to your email" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error:" + error);
    return NextResponse.json(
      { error: "Error sending reset link: " + error },
      { status: 500 },
    );
  }
}
