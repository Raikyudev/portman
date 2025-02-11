import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST( request: Request) {
    await dbConnect();

    try{
        const requestBody = await request.json();
        const { first_name, last_name, username, email, password } = requestBody;
        const foundUser = await User.findOne({
            $or: [{email}, {username}],
        });
        if (foundUser) {
            if (foundUser.email === email) {
                return NextResponse.json({ error: "Email already registered" }, { status: 400 });
            }
            if (foundUser.username === username) {
                return NextResponse.json({ error: "Username already taken" }, { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

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
            message: "User registered successfully",
            user: {
                username: newUser.username,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email
            },
        }, {
            status: 201
        });
    } catch (error) {
        if((error as { code?: number }).code === 11000) {
            return NextResponse.json({
                error: "Duplicate entry."
            }, {
                status: 400
            });
        }
        return NextResponse.json({
            error: "Error occurred: " + error
        }, {status: 500});
    }
}