import { NextResponse } from 'next/server'
import { dbConnect } from "@/lib/mongodb";
import Asset from "@/models/Asset";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if(!query || query.length < 2 ) {
        return NextResponse.json({error: "Search query must be at least 2 characters long"}, { status: 400 });
    }

    await dbConnect();
    try {
        const assets = await Asset.aggregate([
            {
                $match: {
                    $or: [
                        { symbol: { $regex: query, $options: "i" } },
                        { name: { $regex: query, $options: "i" } }
                    ]
                }
            },
            {
                $addFields: {
                    priority: {
                        $cond: {
                            if: { $eq: ["$symbol", query.toUpperCase()] }, then: 1,
                            else: {
                                $cond: {
                                    if: { $regexMatch: { input: "$symbol", regex: query, options: "i" } }, then: 2,
                                    else: 3
                                }
                            }
                        }
                    }
                }
            },
            { $sort: { priority: 1, symbol: 1 } },
            { $limit: 10 }
        ]);

        return NextResponse.json(assets);
    } catch (error) {
        console.error("Error in API route:", error);
        return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }

}