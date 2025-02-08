import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import { NextResponse } from "next/server";

type CustomUser = {
    id: string;
    email: string;
    name: string;
};


export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const user = session.user as CustomUser

    await dbConnect();
    const portfolios = await Portfolio.find({ user_id: user.id});

    return NextResponse.json(portfolios);
}