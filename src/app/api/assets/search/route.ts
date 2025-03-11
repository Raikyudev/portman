import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Asset, { IAsset } from "@/models/Asset";
import { getTodayPriceBySymbol, getPriceChange } from "@/lib/stockPrices";

import { IExtendedAsset } from "@/types/asset";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const market = searchParams.get("market") === "true";

  const specialCaseLimit = parseInt(
    searchParams.get("specialCaseLimit") || "1500",
    10,
  ); // Configurable limit
  const specialCase = market && !query;
  if (query.length < 2 && !market) {
    return NextResponse.json(
      { error: "Invalid query. Minimum length is 2 characters." },
      { status: 400 },
    );
  }

  if (page < 1 || limit < 1) {
    return NextResponse.json(
      { error: "Invalid page or limit parameters" },
      { status: 400 },
    );
  }

  await dbConnect();

  try {
    let assets: IAsset[];
    let total: number;

    if (specialCase) {
      // Special case: Return first N assets sorted by symbol alphabetically
      const queryFilter = query
        ? {
            $or: [
              { symbol: { $regex: new RegExp(query, "i") } },
              { name: { $regex: new RegExp(query, "i") } },
            ],
          }
        : { asset_type: { $in: ["stock", "etf"] } }; // Default filter

      // Step 1: Get total count (capped at specialCaseLimit)
      total = Math.min(
        await Asset.countDocuments(queryFilter),
        specialCaseLimit,
      );

      // Step 2: Fetch assets with simple sorting
      assets = (
        await Asset.find(queryFilter)
          .sort({ symbol: 1 }) // Sort alphabetically by symbol
          .skip((page - 1) * limit)
          .limit(Math.min(limit, specialCaseLimit - (page - 1) * limit)) // Cap at specialCaseLimit
          .lean()
      ).map((doc) => ({
        _id: doc._id,
        symbol: doc.symbol,
        name: doc.name,
        asset_type: doc.asset_type,
        price: doc.price,
        market: doc.market,
      })) as IAsset[]; // Explicitly map to IAsset
    } else {
      // Regular case: Use the existing aggregation pipeline
      const result = await Asset.aggregate(
        [
          // Match stage for filtering by query (if provided)
          ...(query
            ? [
                {
                  $match: {
                    $or: [
                      { symbol: { $regex: new RegExp(query, "i") } },
                      { name: { $regex: new RegExp(query, "i") } },
                    ],
                  },
                },
              ]
            : []),

          // Add calculated fields for sorting
          {
            $addFields: {
              isExactSymbolMatch: {
                $eq: [{ $toLower: "$symbol" }, query.toLowerCase()],
              },
              containsDot: {
                $cond: [
                  { $regexMatch: { input: "$symbol", regex: /\./ } },
                  1,
                  0,
                ],
              },
              assetTypePriority: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$asset_type", "stock"] }, then: 1 },
                    { case: { $eq: ["$asset_type", "etf"] }, then: 2 },
                    { case: { $eq: ["$asset_type", "fund"] }, then: 3 },
                    { case: { $eq: ["$asset_type", "trust"] }, then: 4 },
                  ],
                  default: 5,
                },
              },
            },
          },

          // Sort based on the added fields
          {
            $sort: {
              isExactSymbolMatch: -1,
              containsDot: 1,
              assetTypePriority: 1,
              symbol: 1,
            },
          },

          // Handle pagination using $facet
          {
            $facet: {
              paginatedResults: [
                { $skip: (page - 1) * limit },
                { $limit: limit },
              ],
              totalCount: [{ $count: "count" }],
            },
          },

          // Project the final results
          {
            $project: {
              assets: "$paginatedResults",
              total: { $arrayElemAt: ["$totalCount.count", 0] },
            },
          },
        ],
        { allowDiskUse: true },
      );

      const data = result[0] || { assets: [], total: 0 };
      assets = data.assets as IAsset[]; // Cast to IAsset
      total = data.total || 0;
    }

    // Fetch market data (price and change) only if `market=true`
    let enrichedAssets: IExtendedAsset[];
    if (market) {
      enrichedAssets = await Promise.all(
        assets.map(async (asset: IAsset): Promise<IExtendedAsset> => {
          try {
            const price = await getTodayPriceBySymbol(asset.symbol); // Should match stored price or update it
            const change = await getPriceChange(asset.symbol);
            return {
              ...asset,
              price: price || asset.price || 0, // Use fetched price or fallback to stored price
              change: change || 0,
            } as IExtendedAsset;
          } catch (error) {
            console.error(
              `Failed to fetch market data for symbol "${asset.symbol}":`,
              error,
            );
            return {
              ...asset,
              price: asset.price || 0,
              change: 0,
            } as IExtendedAsset;
          }
        }),
      );
    } else {
      enrichedAssets = assets.map(
        (asset: IAsset) =>
          ({
            ...asset,
            price: asset.price || 0, // Use stored price or default to 0
            change: 0,
          }) as IExtendedAsset,
      );
    }

    // Return the response
    return NextResponse.json({
      assets: enrichedAssets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error processing the request:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets. Please try again later." },
      { status: 500 },
    );
  }
}
