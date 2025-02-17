import PortfolioAsset from "@/models/PortfolioAsset";
import { NextResponse } from "next/server";
import { IAsset } from "@/models/Asset";

export async function GET(request: Request) {
    try{
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if(!id) {
            return NextResponse.json({ error: "No portfolio ID" }, { status: 400 });
        }

        const portfolioAssets = await PortfolioAsset.find({
            portfolio_id: id,
        }).populate<{ asset_id: IAsset }>("asset_id", "symbol name currency");

        return NextResponse.json(portfolioAssets);
    } catch (error) {
        console.error("Error fetching portfolio assets: " + error);
        return NextResponse.json({ error: "Error fetching portfolio assets"}, { status: 500 });
    }

}