import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import { NextResponse } from "next/server";
import { z } from "zod";

const portfolioSchema = z.object({
    name: z.string().min(3, "Portfolio name must be at least 3 characters long"),
    description: z.string().max(255, "Description is too long").optional(),
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = portfolioSchema.safeParse(body);

    if(!result.success) {
        return NextResponse.json(({ error: result.error.format() }));
    }

    await dbConnect();
    const portfolio = new Portfolio({
        name: result.data.name,
        description: result.data.description || "",
        user_id: (session.user as { id: string }).id,
        created_at: new Date(),
        updated_at: new Date(),
    });

    await portfolio.save();
    return NextResponse.json(portfolio, {status: 201});
}

export async function GET() {
    const session = await getServerSession(authOptions);
    console.log("Session Data: ", session);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}