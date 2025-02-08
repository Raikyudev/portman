import dbConnect from "@/lib/mongodb";
import Asset from "@/models/Asset";
import {NextResponse} from "next/server";

export async function GET() {
    await dbConnect();

    try {
        const assets = await Asset.find({});
        console.log("Assets Found:", assets.length);
        return NextResponse.json(assets)
    } catch (error: any) {
        return NextResponse.json({error: error.message})
    }
}

