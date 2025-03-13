// src/lib/stockPrices.ts
import yahooFinance from "yahoo-finance2";
import { getDateRange } from "./utils";
import { getAllCurrencyRates } from "@/lib/currencyExchange";

interface PriceEntry {
  date: string;
  price: number;
}

export async function getStockPrices(
  holdings: Record<string, number>,
  startDate: string,
  endDate: string,
): Promise<Record<string, Record<string, number>>> {
  const stockPrices: Record<string, Record<string, number>> = {};
  const currentDate = new Date().toISOString().split("T")[0];
  const adjustedStartDate = adjustDateToValidRange(startDate, currentDate);
  const adjustedEndDate = adjustDateToValidRange(endDate, currentDate);
  const dateRange = getDateRange(adjustedStartDate, adjustedEndDate);

  if (!holdings || Object.keys(holdings).length === 0) {
    return stockPrices;
  }

  const symbols = Object.keys(holdings);
  console.log("Fetching prices for symbols:", symbols);

  // Fetch full price history for all symbols in parallel
  const priceHistoryPromises = symbols.map((symbol) =>
    getFullPriceHistory(symbol, adjustedStartDate, adjustedEndDate),
  );
  const priceHistories = await Promise.all(priceHistoryPromises);

  // Merge price histories into the expected format
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const history = priceHistories[i];

    for (const entry of history) {
      const date = entry.date;
      stockPrices[date] = stockPrices[date] || {};
      let price = entry.price;

      // Apply fallback if price is 0 or missing
      if (price === 0) {
        price = await fetchPriceForDay(
          symbol,
          date,
          getPriceMapFromHistory(priceHistories, i),
        );
      }
      stockPrices[date][symbol] =
        price > 0 ? price : await getClosestPreviousPrice(symbol, date);
    }
  }

  // Fill in any missing dates with fallbacks
  for (const date of dateRange) {
    if (!stockPrices[date]) {
      stockPrices[date] = {};
      for (const symbol of symbols) {
        stockPrices[date][symbol] = await fetchPriceForDay(symbol, date);
      }
    }
  }

  return stockPrices;
}

// Helper function to create a price map from a single symbol's history
function getPriceMapFromHistory(
  histories: PriceEntry[][],
  index: number,
): Record<string, { open: number; close: number }> {
  const priceMap: Record<string, { open: number; close: number }> = {};
  histories[index].forEach((entry) => {
    priceMap[entry.date] = { open: entry.price, close: entry.price }; // Simplified; adjust if open/close differ
  });
  return priceMap;
}

export async function getStocksPriceForDay(
  holdings: Record<string, number>,
  targetDate: string,
): Promise<Record<string, number>> {
  const stockPrices: Record<string, number> = {};
  const currentDate = new Date().toISOString().split("T")[0];
  const adjustedTargetDate = adjustDateToValidRange(targetDate, currentDate);

  if (!holdings || Object.keys(holdings).length === 0) {
    return stockPrices;
  }

  const processedSymbols = new Set<string>();

  await Promise.all(
    Object.keys(holdings).map(async (symbol) => {
      const price = await fetchPriceForDay(symbol, adjustedTargetDate);
      stockPrices[symbol] = price;
      if (price === 0) {
      } else if (!processedSymbols.has(symbol)) {
        processedSymbols.add(symbol);
      }
    }),
  );

  return stockPrices;
}

async function fetchPriceForDay(
  symbol: string,
  currentDate: string,
  lastKnownPriceMap?: Record<string, { open: number; close: number }>,
): Promise<number> {
  try {
    const period1 = new Date(currentDate);
    const period2 = new Date(currentDate);
    period2.setDate(period2.getDate() + 1);
    const result = await yahooFinance.chart(symbol, {
      period1: period1,
      period2: period2,
      interval: "1d",
      return: "array",
    });

    if (result.quotes && result.quotes.length > 0) {
      const quote = result.quotes[0];
      const openPrice = quote.open || 0;
      const closePrice = quote.close || 0;
      const price = Math.max(openPrice, closePrice);
      if (price > 0) {
        return price;
      }
    }

    return await getClosestPreviousPrice(
      symbol,
      currentDate,
      lastKnownPriceMap,
    );
  } catch (error) {
    console.error(
      `Error fetching price data for ${symbol} on ${currentDate}:`,
      error,
    );
    return (await getClosestPreviousPrice(symbol, currentDate)) || 0;
  }
}
export async function getTodayPriceBySymbol(symbol: string): Promise<number> {
  try {
    const currentDate = new Date().toISOString().split("T")[0];

    // Attempt to get current price using quote
    const quote = await yahooFinance.quote(symbol);
    const currentPrice = quote.regularMarketPrice ?? 0;

    if (currentPrice > 0) {
      return currentPrice;
    }

    return await getClosestPreviousPrice(symbol, currentDate);
  } catch (error) {
    console.error(`Error fetching today's price for ${symbol}:`, error);
    const currentDate = new Date().toISOString().split("T")[0];
    return await getClosestPreviousPrice(symbol, currentDate);
  }
}
export async function getClosestPreviousPrice(
  symbol: string,
  currentDate: string,
  lastKnownPriceMap?: Record<string, { open: number; close: number }>,
): Promise<number> {
  const checkDate = new Date(currentDate);
  const maxLookbackDays = 365;
  let daysBack = 0;

  while (daysBack < maxLookbackDays) {
    checkDate.setDate(checkDate.getDate() - 1);
    const dateStr = checkDate.toISOString().split("T")[0];
    try {
      const period1 = new Date(dateStr);
      const period2 = new Date(dateStr);
      period2.setDate(period2.getDate() + 1);
      const result = await yahooFinance.chart(symbol, {
        period1: period1,
        period2: period2,
        interval: "1d",
        return: "array",
      });

      if (result.quotes && result.quotes.length > 0) {
        const quote = result.quotes[0];
        const openPrice = quote.open || 0;
        const closePrice = quote.close || 0;
        const price = Math.max(openPrice, closePrice);
        if (price > 0) {
          return price;
        }
      }
      daysBack++;
    } catch (error) {
      console.error(
        `Error fetching previous price for ${symbol} on ${dateStr}:`,
        error,
      );
    }
  }

  if (lastKnownPriceMap) {
    const lastKnownEntries = Object.entries(lastKnownPriceMap)
      .filter(([d]) => new Date(d) < new Date(currentDate))
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    const lastKnown = lastKnownEntries[0]?.[1];
    if (lastKnown && (lastKnown.open > 0 || lastKnown.close > 0)) {
      return Math.max(lastKnown.open, lastKnown.close);
    }
  }
  return 0;
}

export async function getPriceChange(symbol: string): Promise<number> {
  try {
    const quote = await yahooFinance.quote(symbol);
    if (quote.regularMarketChangePercent) {
      return quote.regularMarketChangePercent;
    } else {
      console.warn(
        `No regularMarketChangePercent available for ${symbol}, returning 0`,
      );
      return 0;
    }
  } catch (error) {
    console.error(`Error fetching price change for ${symbol}:`, error);
    return 0;
  }
}

function adjustDateToValidRange(dateStr: string, currentDate: string): string {
  const date = new Date(dateStr);
  const today = new Date(currentDate);
  if (date > today) {
    return currentDate;
  }
  return date.toISOString().split("T")[0];
}

// Updated getFullPriceHistory to use different intervals based on period
export async function getFullPriceHistory(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<PriceEntry[]> {
  try {
    if (startDate === endDate) {
      const quote = await yahooFinance.quote(symbol);
      const priceHistory: PriceEntry[] = [];
      priceHistory.push({
        date: startDate,
        price: quote.regularMarketPrice ?? 0,
      });
      console.log(`Fetched full price history for ${symbol}:`, priceHistory);
      return priceHistory;
    } else {
      const results = await yahooFinance.chart(symbol, {
        period1: startDate === endDate ? startDate + 1 : startDate,
        period2: endDate,
        interval: "1d",
      });
      const priceHistory: PriceEntry[] = results.quotes.map(
        (quote: { date: Date; close: number | null }) => ({
          date: quote.date.toISOString().split("T")[0],
          price: quote.close || 0,
        }),
      );
      console.log(`Fetched full price history for ${symbol}:`, priceHistory);
      return priceHistory;
    }
  } catch (error) {
    console.error("Error fetching full price history:", error);
    return [];
  }
}

interface AssetDetailsData {
  marketCap: number;
  volume24h: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingPE: number;
  trailingAnnualDividendYield: number;
}

export async function getAssetDetailsData(
  symbol: string,
): Promise<AssetDetailsData> {
  try {
    // Fetch the quote data for the given symbol
    const quote = await yahooFinance.quote(symbol);
    if (!quote) {
      console.error(`No quote data found for symbol: ${symbol}`);
    }

    // Fetch all currency rates from the database
    const currencyRates = await getAllCurrencyRates();
    console.log(`Loaded ${currencyRates.size} currency rates.`);

    // Determine the currency directly from the quote
    const stockCurrency = quote.currency || "USD"; // Fallback to USD if currency is missing
    console.log(`Detected currency for ${symbol}: ${stockCurrency}`);

    // Extract the required fields with initial values
    let marketCap = quote.marketCap || 0;
    let volume24h = quote.regularMarketVolume || 0;
    const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh || 0;
    const fiftyTwoWeekLow = quote.fiftyTwoWeekLow || 0;
    const trailingPE = quote.trailingPE || 0;
    const trailingAnnualDividendYield = quote.trailingAnnualDividendYield || 0;

    // Convert marketCap and volume24h to USD if not already in USD
    if (stockCurrency !== "USD") {
      const rate = currencyRates.get(stockCurrency.toUpperCase());
      if (rate === undefined) {
        console.warn(
          `No exchange rate found for ${stockCurrency} for ${symbol}, using original values`,
        );
      } else {
        // Convert by dividing by the rate (rate is foreign currency per USD)
        marketCap = marketCap / rate;
        volume24h = volume24h / rate;
      }
    }

    // Ensure non-negative values
    const details: AssetDetailsData = {
      marketCap: Math.max(marketCap, 0),
      volume24h: Math.max(volume24h, 0),
      fiftyTwoWeekHigh: Math.max(fiftyTwoWeekHigh, 0),
      fiftyTwoWeekLow: Math.max(fiftyTwoWeekLow, 0),
      trailingPE: Math.max(trailingPE, 0),
      trailingAnnualDividendYield: Math.max(trailingAnnualDividendYield, 0),
    };

    console.log(`Fetched and converted asset details for ${symbol}:`, details);
    return details;
  } catch (error) {
    console.error(`Error fetching asset details for ${symbol}:`, error);
    // Return default values in case of error
    return {
      marketCap: 0,
      volume24h: 0,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      trailingPE: 0,
      trailingAnnualDividendYield: 0,
    };
  }
}
