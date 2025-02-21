import Asset from "@/models/Asset";
import { dbConnect, closeDatabase } from "@/lib/mongodb";
import fetch from "node-fetch";

const FMP_API_KEY = process.env.FINANCIAL_API_KEY;
if (!FMP_API_KEY) {
  throw new Error("Missing Financial Modeling Prep API Key");
}

interface FetchedAsset {
  symbol: string;
  name: string;
  price: number;
  exchange: string;
  exchangeShortName: string;
  type: string;
}

const exchangeCurrencyMap: { [key: string]: string } = {
  NASDAQ: "USD",
  NYSE: "USD",
  AMEX: "USD",
  TSX: "CAD",
  LSE: "GBP",
  "Euronext Paris": "EUR",
  Frankfurt: "EUR",
  Tokyo: "JPY",
  "Hong Kong": "HKD",
  Shanghai: "CNY",
  "Other OTC": "USD",
};

export default async function fetchAssets() {
  await dbConnect();

  try {
    console.log("Fetching assets from API...");
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/available-traded/list?apikey=${FMP_API_KEY}`,
    );

    if (!response.ok) {
      console.error(`Error fetching assets: ${response.statusText}`);
      return;
    }

    const stocks: FetchedAsset[] = (await response.json()) as FetchedAsset[];

    console.log(`Fetched ${stocks.length} assets from API.`);

    const logInterval = setInterval(() => {
      console.log(`Processing... ${stocks.length} assets`);
    }, 10_000);

    const bulkOps = stocks.map((stock) => {
      return {
        updateOne: {
          filter: { symbol: stock.symbol },
          update: {
            $set: {
              symbol: stock.symbol,
              name: stock.name,
              price: stock.price || 0,
              currency: exchangeCurrencyMap[stock.exchange] || "USD",
              market: stock.exchangeShortName,
              asset_type: stock.type,
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      const result = await Asset.bulkWrite(bulkOps);
      console.log(
        `Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`,
      );
    } else {
      console.log("No assets to update.");
    }

    clearInterval(logInterval);
  } catch (error) {
    console.log("Error fetching assets list" + error);
  }

  console.log("Finished fetching assets");
  await closeDatabase();
}
