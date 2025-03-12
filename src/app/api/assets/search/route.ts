import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Asset, { IAsset } from "@/models/Asset";
import { getTodayPriceBySymbol, getPriceChange } from "@/lib/stockPrices";
import { broadMarketFetch } from "@/lib/broadMarketFetch";
import { IExtendedAsset } from "@/types/asset";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const market = searchParams.get("market") === "true";
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

  // Retrieve session and currency using getServerSession
  const session = await getServerSession(authOptions);
  const userCurrency = session?.user?.preferences?.currency || "USD"; // Fallback to USD

  try {
    let assets: IAsset[];
    let total: number;

    if (specialCase) {
      // Use broadMarketFetch for special case with user's currency from session
      const marketData = await broadMarketFetch({
        page,
        limit,
        userCurrency: userCurrency as string,
      });
      assets = marketData.assets;
      total = marketData.total;
    } else {
      const result = await Asset.aggregate(
        [
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
          {
            $addFields: {
              isExactSymbolMatch: {
                $eq: [{ $toLower: "$symbol" }, query.toLowerCase()],
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
          {
            $sort: {
              isExactSymbolMatch: -1, // Exact matches first (if query exists)
              assetTypePriority: 1, // Then by asset type priority (ascending)
              symbol: 1, // Finally by symbol alphabetically (ascending)
            },
          },
          {
            $facet: {
              paginatedResults: [
                { $skip: (page - 1) * limit },
                { $limit: limit },
              ],
              totalCount: [{ $count: "count" }],
            },
          },
          {
            $project: {
              assets: {
                $map: {
                  input: "$paginatedResults",
                  as: "item",
                  in: {
                    _id: "$$item._id",
                    symbol: "$$item.symbol",
                    name: "$$item.name",
                    asset_type: "$$item.asset_type",
                    price: "$$item.price",
                    market: "$$item.market",
                    isExactSymbolMatch: "$$item.isExactSymbolMatch",
                    marketPriority: "$$item.marketPriority",
                    assetTypePriority: "$$item.assetTypePriority",
                  },
                },
              },
              total: { $arrayElemAt: ["$totalCount.count", 0] },
            },
          },
        ],
        { allowDiskUse: true },
      );

      const data = result[0] || { assets: [], total: 0 };
      assets = data.assets as IAsset[];
      total = data.total || 0;

      // Filter out assets missing required fields
      assets = assets.filter((asset) => {
        if (!asset.symbol || !asset.name) {
          console.warn(
            `Asset missing symbol or name after aggregation:`,
            asset,
          );
          return false;
        }
        return true;
      });
    }

    console.log("Assets before enrichment:", assets); // Log full objects

    let enrichedAssets: IExtendedAsset[];
    if (market) {
      enrichedAssets = await Promise.all(
        assets.map(async (asset: IAsset): Promise<IExtendedAsset> => {
          try {
            const price = await getTodayPriceBySymbol(asset.symbol);
            const change = await getPriceChange(asset.symbol);
            return {
              ...asset,
              price: price || asset.price || 0,
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
            price: asset.price || 0,
            change: 0,
          }) as IExtendedAsset,
      );
    }

    console.log("Enriched assets:", enrichedAssets); // Log full enriched data

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
