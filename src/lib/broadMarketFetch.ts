// Search helper functions

import { dbConnect } from "@/lib/mongodb";
import Asset, { IAsset } from "@/models/Asset";
import { marketPriorityMap } from "@/lib/constants";

// Sort assets based on market priority and asset type
function sortAssets(assets: IAsset[], userCurrency: string): IAsset[] {
  // Sort assets by market priority first
  const initiallySorted = assets.sort((a, b) => {
    const priorityA = marketPriorityMap[userCurrency] || [];
    const priorityB = marketPriorityMap[userCurrency] || [];
    const indexA = priorityA.indexOf(a.market);
    const indexB = priorityB.indexOf(b.market);

    // Compare based on user's preferences
    const marketComparison =
      indexA === -1 && indexB === -1
        ? 0
        : indexA === -1
          ? 1
          : indexB === -1
            ? -1
            : indexA - indexB;
    if (marketComparison !== 0) return marketComparison;

    // If market priority is same, sort by asset type
    const assetTypePriority: { [key: string]: number } = {
      stock: 1,
      etf: 2,
      fund: 3,
      trust: 4,
    };
    const priorityAByType = assetTypePriority[a.asset_type] || 5;
    const priorityBByType = assetTypePriority[b.asset_type] || 5;
    return priorityAByType - priorityBByType;
  });

  // Group assets by market and asset type
  const grouped: { [key: string]: IAsset[] } = {};
  initiallySorted.forEach((asset) => {
    const key = `${asset.market}-${asset.asset_type}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(asset);
  });

  // Sort assets alphabetically inside each g roup
  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => {
      const symbolA = a.symbol.toLowerCase();
      const symbolB = b.symbol.toLowerCase();
      return symbolA.localeCompare(symbolB);
    });
  });

  // Reconstruct the full sorted list based on market and type
  const sortedAssets: IAsset[] = [];

  // RGet unique list of markets
  const markets = [...new Set(initiallySorted.map((asset) => asset.market))];

  // Sort markets by user's market preferences based on user currency
  markets.sort((a, b) => {
    const indexA = marketPriorityMap[userCurrency]?.indexOf(a) ?? -1;
    const indexB = marketPriorityMap[userCurrency]?.indexOf(b) ?? -1;
    return indexA === -1 && indexB === -1
      ? 0
      : indexA === -1
        ? 1
        : indexB === -1
          ? -1
          : indexA - indexB;
  });

  const assetTypes = ["stock", "etf", "fund", "trust"];

  // Add assets back in correct order by market and type
  markets.forEach((market) => {
    assetTypes.forEach((type) => {
      const key = `${market}-${type}`;
      if (grouped[key]) {
        sortedAssets.push(...grouped[key]);
      }
    });
  });

  return sortedAssets;
}

interface BroadMarketFetchParams {
  page: number;
  limit: number;
  userCurrency?: string;
}

// Fetch and paginate all assets, sorted according to user preferred currency
export async function broadMarketFetch({
  page,
  limit,
  userCurrency = "USD",
}: BroadMarketFetchParams): Promise<{ assets: IAsset[]; total: number }> {
  try {
    await dbConnect();

    let assets: IAsset[] = (await Asset.find({}).exec()).map((doc) =>
      doc.toObject(),
    );

    // Filter out assets missing required fields
    assets = assets.filter((asset) => {
      return asset.symbol || asset.name;
    });

    // Sort assets by market and type preferrences
    assets = sortAssets(assets, userCurrency);

    // Apply pagination
    const total = assets.length;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);
    const paginatedAssets = assets.slice(startIndex, endIndex);

    return {
      assets: paginatedAssets,
      total,
    };
  } catch (error) {
    console.error("Error in broadMarketFetch:", error);
    throw new Error("Failed to fetch broad market data");
  }
}
