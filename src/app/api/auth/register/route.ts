import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { uuidv4 } from "mongodb-memory-server-core/lib/util/utils";

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
    const requestBody = await request.json();
    const { first_name, last_name, email, password } = requestBody;
    const foundUser = await User.findOne({
      $or: [{ email }],
    });
    if (foundUser) {
      if (foundUser.email === email) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const confirmationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/confirm?token=${verificationToken}`;
    await transporter.sendMail({
      from: "no-reply@portman-demo.tech",
      to: email,
      subject: "Confirm Your Email",
      text: `Please confirm your email by clicking this link: ${confirmationLink}`,
      html: `<p>Please confirm your email by clicking <a href="${confirmationLink}">this link</a>.</p>`,
    });
    const newUser = await User.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      preferences: { currency: "GBP" },
      created_at: new Date(),
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });
    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          email: newUser.email,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        {
          error: "Duplicate entry.",
        },
        {
          status: 400,
        },
      );
    }
    return NextResponse.json(
      {
        error: "Error occurred: " + error,
      },
      { status: 500 },
    );
  }
}
