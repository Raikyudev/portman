import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if(!id){
        return NextResponse.json({ error: "Portfolio ID is required"}, { status : 404});
    }

    await dbConnect();

    const portfolio = await Portfolio.findOne({
        _id: id,
        user_id: (session.user as { id: string }).id,
    })

    if(!portfolio){
        return NextResponse.json({ error: "Forbidden: You don't own this portfolio" }, { status: 403 });
    }

    return NextResponse.json({ message: "Portfolio is valid" }, { status: 200 });

}