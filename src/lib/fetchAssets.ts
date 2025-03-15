import Asset from "@/models/Asset";
import { dbConnect, closeDatabase } from "@/lib/mongodb";
import fetch from "node-fetch";
import { getAllCurrencyRates } from "@/lib/currencyExchange";

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

    let stocks: FetchedAsset[] = (await response.json()) as FetchedAsset[];
    console.log(`Fetched ${stocks.length} assets from API.`);

    stocks = stocks.filter(
      (stock) => stock.exchangeShortName in exchangeCurrencyMap,
    );

    // Preload all currency rates
    console.log("Fetching all currency rates...");
    const currencyRates = await getAllCurrencyRates();
    console.log(`Loaded ${currencyRates.size} currency rates.`);

    const logInterval = setInterval(() => {
      console.log(`Processing... ${stocks.length} assets`);
    }, 10_000);

    const bulkOps = await Promise.all(
      stocks.map(async (stock) => {
        const stockCurrency =
          exchangeCurrencyMap[stock.exchangeShortName] || "USD";

        // Convert price to USD by dividing by the exchange rate (rate is foreign currency per USD)
        let convertedPrice = stock.price || 0;
        if (stockCurrency !== "USD") {
          const rate = currencyRates.get(stockCurrency.toUpperCase());
          if (rate === undefined) {
            console.warn(
              `No exchange rate found for ${stockCurrency} for ${stock.symbol}, using original price`,
            );
          } else {
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
              },
            },
            upsert: true,
          },
        };
      }),
    );

    if (bulkOps.length > 0) {
      const result = await Asset.bulkWrite(bulkOps);
      console.log("result: ", result);
    } else {
      console.log("No assets to update.");
    }

    clearInterval(logInterval);
  } catch (error) {
    console.log("Error fetching assets list: " + error);
  }

  console.log("Finished fetching assets");
  await closeDatabase();
}
