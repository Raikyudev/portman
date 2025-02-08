import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST( request: Request) {
    await dbConnect();

    try{
        const { username, first_name, last_name, email, password } = await request.json();

        const foundUser = await User.findOne({ email });
        if (foundUser) {
            return NextResponse.json({
                error: "User already exists"
            },{status: 400});
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            username,
            first_name,
            last_name,
            email,
            password: hashedPassword,
            preferences: { currency: "GBP" },
            created_at: new Date(),
        });

        return NextResponse.json({
            user: newUser
        }, {status: 201});
    } catch (error) {
        return NextResponse.json({
            error: "Error occurred: " + error
        }, {status: 500});
    }
}