import { dbConnect } from "@/lib/mongodb";
import Asset, { IAsset } from "@/models/Asset";
import { marketPriorityMap } from "@/lib/constants";

// Helper function to sort assets based on user's currency
function sortAssets(assets: IAsset[], userCurrency: string): IAsset[] {
  // Step 1: Initial sort by market and asset type
  const initiallySorted = assets.sort((a, b) => {
    // 1. Market priority based on user's currency
    const priorityA = marketPriorityMap[userCurrency] || [];
    const priorityB = marketPriorityMap[userCurrency] || [];
    const indexA = priorityA.indexOf(a.market);
    const indexB = priorityB.indexOf(b.market);
    const marketComparison =
      indexA === -1 && indexB === -1
        ? 0
        : indexA === -1
          ? 1
          : indexB === -1
            ? -1
            : indexA - indexB;
    if (marketComparison !== 0) return marketComparison;

    // 2. Asset type priority (ascending)
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

  // Step 2: Group by market and asset type, then sort alphabetically within each group
  const grouped: { [key: string]: IAsset[] } = {};
  initiallySorted.forEach((asset) => {
    const key = `${asset.market}-${asset.asset_type}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(asset);
  });

  // Sort each group alphabetically by symbol
  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => {
      const symbolA = a.symbol.toLowerCase();
      const symbolB = b.symbol.toLowerCase();
      return symbolA.localeCompare(symbolB);
    });
  });

  // Flatten the groups back into a single array while preserving order
  const sortedAssets: IAsset[] = [];
  // Reconstruct the array in the order of market priority
  const markets = [...new Set(initiallySorted.map((asset) => asset.market))];
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
  userCurrency?: string; // Optional parameter for user's currency
}

export async function broadMarketFetch({
  page,
  limit,
  userCurrency = "USD", // Default to USD if not provided
}: BroadMarketFetchParams): Promise<{ assets: IAsset[]; total: number }> {
  try {
    await dbConnect();

    // Fetch all assets and convert to plain objects
    let assets: IAsset[] = (await Asset.find({}).exec()).map((doc) =>
      doc.toObject(),
    );
    console.log("Raw assets from DB (first 10):", assets.slice(0, 10)); // Log first 10 for brevity

    // Filter out assets missing required fields
    assets = assets.filter((asset) => {
      if (!asset.symbol || !asset.name) {
        console.warn(`Asset missing symbol or name:`, asset);
        return false;
      }
      return true;
    });

    // Apply client-side sorting based on user's currency
    assets = sortAssets(assets, userCurrency);
    console.log("Sorted assets (first 10):", assets.slice(0, 10)); // Log first 10 after sorting
    console.log(
      "Full sorted assets order (first 100 symbols):",
      assets.slice(0, 100).map((a) => a.symbol),
    ); // Log symbols to verify order
    console.log(
      "Sorted assets by market and type (first 10):",
      assets
        .slice(0, 10)
        .map((a) => ({
          symbol: a.symbol,
          market: a.market,
          asset_type: a.asset_type,
        })),
    ); // Debug market and type

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
