import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import Transaction from "@/models/Transaction";
import Asset from "@/models/Asset";
import { NextResponse } from "next/server";
import { z } from "zod";

const transactionSchema = z.object({
    portfolio_id: z.string(),
    asset_id: z.string(),
    tx_type: z.enum(["buy", "sell"]),
    quantity: z.number().positive(),
    price_per_unit: z.number().positive(),
    currency: z.string(),
    date: z.string(),
});

export async function POST(request: Request) {
    const session = await getServerSession (authOptions);

    if (!session || !session.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const body = await request.json();
    const result = transactionSchema.safeParse(body);

    if(!result.success) {
        return NextResponse.json({error: result.error.format()}, {status: 400});
    }

    await dbConnect();

    const portfolio = await Portfolio.findOne({
        _id: result.data.portfolio_id,
        user_id: (session.user as { id: string }).id,
    });

    if(!portfolio){
        return NextResponse.json({error: "Portfolio not found or unauthorized"}, {status: 403})
    }

    const asset = await Asset.findById(result.data.asset_id);
    if(!asset){
        return NextResponse.json({ error: "Asset not found"}, { status: 404 });
    }

    const transaction = new Transaction({
        portfolio_id: result.data.portfolio_id,
        asset_id: result.data.asset_id,
        tx_type: result.data.tx_type,
        quantity: result.data.quantity,
        price_per_unit: result.data.price_per_unit,
        currency: result.data.currency,
        tx_date: result.data.date,
    });

    await transaction.save();
    return NextResponse.json(transaction, {status: 201});

}