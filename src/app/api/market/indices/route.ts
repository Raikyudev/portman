// Fetch major indices data

import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { getServerExchangeRates } from "@/lib/currencyExchange";

// List of major indices symbols
const indexList = [
  { symbol: "^NDX", name: "NASDAQ-100" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^HSI", name: "Hang Seng" },
  { symbol: "^FTSE", name: "FTSE 100" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^GDAXI", name: "DAX 30" },
  { symbol: "^RUT", name: "Russell 2000" },
  { symbol: "^FCHI", name: "CAC 40" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50" },
  { symbol: "^N225", name: "Nikkei 225" },
];

// Supported currencies
const supportedCurrencies = ["USD", "CAD", "GBP", "EUR", "JPY", "HKD", "CNY"];

export async function GET(request: Request) {
  try {
    const exchangeRates = await getServerExchangeRates(request);
    const indices = [];

    for (const { symbol, name } of indexList) {
      const quote = await yahooFinance.quote(symbol);

      if (!quote.regularMarketPrice || !quote.currency) continue;

      let price = quote.regularMarketPrice;
      const currency = quote.currency.toUpperCase();

      // Convert price to usd if needed
      if (currency !== "USD") {
        if (supportedCurrencies.includes(currency)) {
          const rate = exchangeRates.get(currency);
          if (!rate) continue;
          price = price / rate;
        } else {
          console.warn(`Skipping ${symbol}: unsupported currency ${currency}`);
          continue;
        }
      }

      indices.push({
        name,
        price,
        change: `${(quote.regularMarketChangePercent ?? 0).toFixed(2)}%`,
      });
    }

    return NextResponse.json({ indices }, { status: 200 });
  } catch (error) {
    console.error("Error fetching indices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
