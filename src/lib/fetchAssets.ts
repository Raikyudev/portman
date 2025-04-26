// fetchAssets script for saving assets in the database

import Asset from "@/models/Asset";
import { dbConnect, closeDatabase } from "@/lib/mongodb";
import fetch from "node-fetch";
import { getServerExchangeRates } from "@/lib/currencyExchange";

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

// Map exchange short anmes to their native currencies
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
};

export default async function fetchAssets(request: Request) {
  await dbConnect();

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/available-traded/list?apikey=${FMP_API_KEY}`,
    );

    if (!response.ok) {
      console.error(`Error fetching assets: ${response.statusText}`);
      return;
    }

    let stocks: FetchedAsset[] = (await response.json()) as FetchedAsset[];

    // Only keep supported exchanges
    stocks = stocks.filter(
      (stock) => stock.exchangeShortName in exchangeCurrencyMap,
    );

    // Get server currency exchange rates
    const currencyRates = await getServerExchangeRates(request);

    const logInterval = setInterval(() => {}, 10_000);

    const bulkOps = await Promise.all(
      stocks.map(async (stock) => {
        const stockCurrency =
          exchangeCurrencyMap[stock.exchangeShortName] || "USD";

        let convertedPrice = stock.price || 0;
        if (stockCurrency !== "USD") {
          const rate = currencyRates.get(stockCurrency.toUpperCase());
          if (rate === undefined) {
            console.warn(
              `No exchange rate found for ${stockCurrency} for ${stock.symbol}, using original price`,
            );
          } else {
            // Convert price to USD
            convertedPrice = stock.price / rate;
          }
        }

        return {
          updateOne: {
            filter: { symbol: stock.symbol },
            update: {
              $set: {
                symbol: stock.symbol,
                name: stock.name,
                price: convertedPrice,
                market: stock.exchangeShortName,
                asset_type: stock.type,
                last_updated: new Date(),
              },
            },
            upsert: true, // Insert if missing
          },
        };
      }),
    );

    if (bulkOps.length > 0) {
      await Asset.bulkWrite(bulkOps);
    } else {
    }

    clearInterval(logInterval);
  } catch (error) {
    console.error("Error fetching assets list: " + error);
  }

  console.log("Finished fetching assets");
  await closeDatabase();
}
