// Yahoo Finance API interaction file

import yahooFinance from "yahoo-finance2";
import { getDateRange } from "./utils";
import {
  getAllCurrencyRates,
  getServerExchangeRates,
} from "@/lib/currencyExchange";

interface PriceEntry {
  date: string;
  price: number;
}

// Validate if a symbol exists on Yahoo Finance
async function isValidSymbol(symbol: string): Promise<boolean> {
  try {
    const quote = await yahooFinance.quote(symbol);
    return (
      !!quote &&
      (quote.regularMarketPrice !== undefined || quote.symbol === symbol)
    );
  } catch (error) {
    console.error(`Symbol validation failed for ${symbol}:`, error);
    return false;
  }
}

// Fetch price history for all holdings between dates
export async function getStockPrices(
  holdings: Record<string, number>,
  startDate: string,
  endDate: string,
  request: Request,
): Promise<Record<string, Record<string, number>>> {
  const stockPrices: Record<string, Record<string, number>> = {};
  const currentDate = new Date().toISOString().split("T")[0];
  const adjustedStartDate = adjustDateToValidRange(startDate, currentDate);
  const adjustedEndDate = adjustDateToValidRange(endDate, currentDate);
  const dateRange = getDateRange(adjustedStartDate, adjustedEndDate).sort();

  if (!holdings || Object.keys(holdings).length === 0) {
    return stockPrices;
  }

  const currencyRates = await getServerExchangeRates(request);

  const symbols = Object.keys(holdings);
  const symbolQuotes: Map<string, any> = new Map();
  const validSymbols: string[] = [];

  // Validate symboils and fetch quotes
  await Promise.all(
    symbols.map(async (symbol) => {
      if (await isValidSymbol(symbol)) {
        const quote = await yahooFinance.quote(symbol);
        symbolQuotes.set(symbol, quote);
        validSymbols.push(symbol);
      } else {
        console.warn(`Skipping invalid symbol: ${symbol}`);
      }
    }),
  );

  if (validSymbols.length === 0) {
    return stockPrices;
  }

  // Fetch historical prices
  const priceHistoryPromises = validSymbols.map((symbol) =>
    getFullPriceHistory(symbol, adjustedStartDate, adjustedEndDate),
  );
  const priceHistories = await Promise.all(priceHistoryPromises);

  // Map prices into stockPrices per day
  for (let i = 0; i < validSymbols.length; i++) {
    const symbol = validSymbols[i];
    const history = priceHistories[i];
    const quote = symbolQuotes.get(symbol);
    const stockCurrency = quote?.currency || "USD";
    const rate = currencyRates.get(stockCurrency.toUpperCase()) || 1;

    for (const entry of history) {
      const date = entry.date;
      stockPrices[date] = stockPrices[date] || {};
      let price = entry.price;

      price = stockCurrency !== "USD" ? price / rate : price;

      if (price === 0) {
        price = await fetchPriceForDay(
          symbol,
          date,
          getPriceMapFromHistory(priceHistories, i),
          request,
        );
      }

      stockPrices[date][symbol] =
        price > 0
          ? price
          : await getClosestPreviousPrice(symbol, date, request);
    }
  }

  const lastKnownPrices: Record<string, number> = {};

  // Fill missing prices using previous known prices
  for (const date of dateRange) {
    stockPrices[date] = stockPrices[date] || {};

    for (const symbol of validSymbols) {
      if (
        stockPrices[date][symbol] !== undefined &&
        stockPrices[date][symbol] > 0
      ) {
        lastKnownPrices[symbol] = stockPrices[date][symbol];
      } else if (lastKnownPrices[symbol] !== undefined) {
        stockPrices[date][symbol] = lastKnownPrices[symbol];
      } else {
        const fallbackPrice = await fetchPriceForDay(
          symbol,
          date,
          undefined,
          request,
        );
        stockPrices[date][symbol] = fallbackPrice;
        if (fallbackPrice > 0) {
          lastKnownPrices[symbol] = fallbackPrice;
        }
      }
    }
  }

  // Zero out invalid symbols
  symbols.forEach((symbol) => {
    if (!validSymbols.includes(symbol)) {
      dateRange.forEach((date) => {
        stockPrices[date] = stockPrices[date] || {};
        stockPrices[date][symbol] = 0;
      });
    }
  });

  return stockPrices;
}

// Build map from price histories
function getPriceMapFromHistory(
  histories: PriceEntry[][],
  index: number,
): Record<string, { open: number; close: number }> {
  const priceMap: Record<string, { open: number; close: number }> = {};
  histories[index].forEach((entry) => {
    priceMap[entry.date] = { open: entry.price, close: entry.price };
  });
  return priceMap;
}

// Fetch stock prices for a specific date
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

  const symbols = Object.keys(holdings);
  const validSymbols: string[] = [];

  // Validate symbols
  const validationPromises = symbols.map(async (symbol) => {
    const isValid = await isValidSymbol(symbol);
    if (isValid) {
      validSymbols.push(symbol);
    } else {
      console.warn(`Skipping invalid symbol: ${symbol}`);
      stockPrices[symbol] = 0;
    }
  });
  await Promise.all(validationPromises);

  if (validSymbols.length === 0) {
    return stockPrices;
  }

  const processedSymbols = new Set<string>();

  // Fetch prices
  await Promise.all(
    validSymbols.map(async (symbol) => {
      const price = await fetchPriceForDay(symbol, adjustedTargetDate);
      stockPrices[symbol] = price;
      if (price > 0 && !processedSymbols.has(symbol)) {
        processedSymbols.add(symbol);
      }
    }),
  );

  return stockPrices;
}

// Try to fetch price for a day, fallback to closest previous price
async function fetchPriceForDay(
  symbol: string,
  currentDate: string,
  lastKnownPriceMap?: Record<string, { open: number; close: number }>,
  request?: Request,
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

    const currencyRates = request
      ? await getServerExchangeRates(request)
      : new Map();
    const quote = await yahooFinance.quote(symbol);
    const stockCurrency = quote.currency || "USD";
    const rate = currencyRates.get(stockCurrency.toUpperCase()) || 1;

    if (result.quotes && result.quotes.length > 0) {
      const quote = result.quotes[0];
      const openPrice = quote.open || 0;
      const closePrice = quote.close || 0;
      const price = Math.max(openPrice, closePrice);
      if (price > 0) {
        return stockCurrency !== "USD" ? price / rate : price;
      }
    }

    return await getClosestPreviousPrice(symbol, currentDate, request);
  } catch (error) {
    console.error(
      `Error fetching price data for ${symbol} on ${currentDate}:`,
      error,
    );
    return (await getClosestPreviousPrice(symbol, currentDate, request)) || 0;
  }
}

// Get today's price
export async function getTodayPriceBySymbol(symbol: string): Promise<number> {
  if (!(await isValidSymbol(symbol))) {
    console.warn(`Invalid symbol ${symbol}, returning 0`);
    return 0;
  }

  try {
    const quote = await yahooFinance.quote(symbol);
    const currentPrice = quote.regularMarketPrice ?? 0;

    if (currentPrice > 0) {
      return currentPrice;
    }
  } catch (yahooError) {
    console.error(
      `Error fetching price from Yahoo Finance for ${symbol}:`,
      yahooError,
    );
  }

  // Fallback API fetch
  try {
    const response = await fetch(
      `/api/assets/get-price?symbol=${encodeURIComponent(symbol)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error("API fetch failed");
    }

    const data = await response.json();

    if (data.error) {
      console.error(data.error);
    }

    if (data.price !== undefined && data.price > 0) {
      return data.price;
    }

    console.error("No valid price returned from /api/assets/get-price");
  } catch (apiError) {
    console.error(
      `Error fetching price from /api/assets/get-price for ${symbol}:`,
      apiError,
    );
  }

  return 0;
}

// Search backwards up to 30 days for a previous valid price
export async function getClosestPreviousPrice(
  symbol: string,
  currentDate: string,
  request?: Request,
  lastKnownPriceMap?: Record<string, { open: number; close: number }>,
): Promise<number> {
  if (lastKnownPriceMap) {
    const lastKnownEntries = Object.entries(lastKnownPriceMap)
      .filter(([d]) => new Date(d) < new Date(currentDate))
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    const lastKnown = lastKnownEntries[0]?.[1];
    if (lastKnown && (lastKnown.open > 0 || lastKnown.close > 0)) {
      const quote = await yahooFinance.quote(symbol);
      const stockCurrency = quote.currency || "USD";
      const currencyRates = request
        ? await getServerExchangeRates(request)
        : new Map();
      const rate = currencyRates.get(stockCurrency.toUpperCase()) || 1;
      const price = Math.max(lastKnown.open, lastKnown.close);
      return stockCurrency !== "USD" ? price / rate : price; // Convert to USD
    }
  }

  if (!(await isValidSymbol(symbol))) {
    console.warn(`Invalid symbol ${symbol}, returning 0`);
    return 0;
  }

  const checkDate = new Date(currentDate);
  const maxLookbackDays = 30;
  let daysBack = 0;

  const currencyRates = request
    ? await getServerExchangeRates(request)
    : new Map();
  const quote = await yahooFinance.quote(symbol);
  const stockCurrency = quote.currency || "USD";
  const rate = currencyRates.get(stockCurrency.toUpperCase()) || 1;

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
          return stockCurrency !== "USD" ? price / rate : price;
        }
      }
      daysBack++;
    } catch (error) {
      console.error(
        `Error fetching previous price for ${symbol} on ${dateStr}:`,
        error,
      );
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string" &&
        (error.message.includes("Not Found") ||
          error.message.includes("Invalid symbol"))
      ) {
        console.warn(
          `Symbol ${symbol} appears to be invalid, stopping lookback`,
        );
        break;
      }
    }
  }

  return 0;
}

// Adjust date if it's in the future
function adjustDateToValidRange(dateStr: string, currentDate: string): string {
  const date = new Date(dateStr);
  const today = new Date(currentDate);
  if (date > today) {
    return currentDate;
  }
  return date.toISOString().split("T")[0];
}

// Fetch full daily price history between two dates
export async function getFullPriceHistory(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<PriceEntry[]> {
  if (!(await isValidSymbol(symbol))) {
    console.warn(`Invalid symbol ${symbol}, returning empty history`);
    return [];
  }

  try {
    if (startDate === endDate) {
      const quote = await yahooFinance.quote(symbol);
      const priceHistory: PriceEntry[] = [];
      priceHistory.push({
        date: startDate,
        price: quote.regularMarketPrice ?? 0,
      });

      return priceHistory;
    } else {
      const results = await yahooFinance.chart(symbol, {
        period1: startDate === endDate ? startDate + 1 : startDate,
        period2: endDate,
        interval: "1d",
      });
      return results.quotes.map(
        (quote: { date: Date; close: number | null }) => ({
          date: quote.date.toISOString().split("T")[0],
          price: quote.close || 0,
        }),
      );
    }
  } catch (error) {
    console.error("Error fetching full price history:", error);
    return [];
  }
}

// Fetch extra asset details
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
  if (!(await isValidSymbol(symbol))) {
    console.warn(`Invalid symbol ${symbol}, returning default asset details`);
    return {
      marketCap: 0,
      volume24h: 0,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      trailingPE: 0,
      trailingAnnualDividendYield: 0,
    };
  }

  try {
    const quote = await yahooFinance.quote(symbol);
    const currencyRates = await getAllCurrencyRates();

    const stockCurrency = quote.currency || "USD";

    let marketCap = quote.marketCap || 0;
    let volume24h = quote.regularMarketVolume || 0;
    const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh || 0;
    const fiftyTwoWeekLow = quote.fiftyTwoWeekLow || 0;
    const trailingPE = quote.trailingPE || 0;
    const trailingAnnualDividendYield = quote.trailingAnnualDividendYield || 0;

    if (stockCurrency !== "USD") {
      const rate = currencyRates.get(stockCurrency.toUpperCase());
      if (rate === undefined) {
        console.warn(
          `No exchange rate found for ${stockCurrency} for ${symbol}, using original values`,
        );
      } else {
        marketCap = marketCap / rate;
        volume24h = volume24h / rate;
      }
    }

    return {
      marketCap: Math.max(marketCap, 0),
      volume24h: Math.max(volume24h, 0),
      fiftyTwoWeekHigh: Math.max(fiftyTwoWeekHigh, 0),
      fiftyTwoWeekLow: Math.max(fiftyTwoWeekLow, 0),
      trailingPE: Math.max(trailingPE, 0),
      trailingAnnualDividendYield: Math.max(trailingAnnualDividendYield, 0),
    };
  } catch (error) {
    console.error(`Error fetching asset details for ${symbol}:`, error);
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

// Fetch price change percentage today
export async function getPriceChange(symbol: string): Promise<number> {
  if (!(await isValidSymbol(symbol))) {
    console.warn(`Invalid symbol ${symbol}, returning 0`);
    return 0;
  }

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
