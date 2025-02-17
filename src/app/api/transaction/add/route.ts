import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import Transaction from "@/models/Transaction";
import Asset from "@/models/Asset";
import { NextResponse } from "next/server";
import { z } from "zod";
import PortfolioAsset from "@/models/PortfolioAsset";

const transactionSchema = z.object({
    portfolio_id: z.string(),
    asset_id: z.string(),
    tx_type: z.enum(["buy", "sell"]),
    quantity: z.number().positive(),
    price_per_unit: z.number().positive(),
    currency: z.string(),
    tx_date: z.string(),
});

export async function POST(request: Request) {
    const session = await getServerSession (authOptions);

    if (!session || !session.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const body = await request.json();
    const result = transactionSchema.safeParse(body);

    if(!result.success) {
        console.log("Validation Error: ", result.error.format());
        return NextResponse.json({ error: result.error.format() }, { status: 400 });
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

    const existingPortfolioAsset = await PortfolioAsset.findOne({
        portfolio_id: result.data.portfolio_id,
        asset_id: result.data.asset_id,
    });

    if(result.data.tx_type === "buy") {
        if(existingPortfolioAsset) {
            const totalOldValue = existingPortfolioAsset.quantity * existingPortfolioAsset.avg_buy_price;
            const totalNewValue = result.data.quantity * result.data.price_per_unit;
            const totalQuantity = existingPortfolioAsset.quantity + result.data.quantity;

            existingPortfolioAsset.avg_buy_price = (totalOldValue + totalNewValue) / totalQuantity;
            existingPortfolioAsset.quantity = totalQuantity;

            await existingPortfolioAsset.save();
        } else {
            const newPortfolioAsset = new PortfolioAsset({
                portfolio_id: result.data.portfolio_id,
                asset_id: result.data.asset_id,
                quantity: result.data.quantity,
                avg_buy_price: result.data.price_per_unit,
                currency: result.data.currency,
                created_at : new Date(),
            });

            await newPortfolioAsset.save();
        }
    }else if (result.data.tx_type === "sell"){
        if (!existingPortfolioAsset || existingPortfolioAsset.quantity < result.data.quantity) {
            return NextResponse.json({ error: "Not enough shares to sell" }, { status: 400 });
        }

        existingPortfolioAsset.quantity -= result.data.quantity;

        if(existingPortfolioAsset.quantity === 0){
            await existingPortfolioAsset.deleteOne({ _id: existingPortfolioAsset._id})
        } else {
            await existingPortfolioAsset.save();
        }
    } else {
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }


    const transaction = new Transaction({
        portfolio_id: result.data.portfolio_id,
        asset_id: result.data.asset_id,
        tx_type: result.data.tx_type,
        quantity: result.data.quantity,
        price_per_unit: result.data.price_per_unit,
        currency: result.data.currency,
        tx_date: result.data.tx_date,
    });

    await transaction.save();
    return NextResponse.json(transaction, {status: 201});

}