import yahooFinance from "yahoo-finance2";
import { getDateRange } from "./utils";

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

  await Promise.all(
    Object.keys(holdings).map(async (symbol) => {
      try {
        const period1 = new Date(adjustedStartDate);
        const period2 = new Date(adjustedEndDate);
        if (
          period1.toISOString().split("T")[0] ===
          period2.toISOString().split("T")[0]
        ) {
          period2.setDate(period2.getDate() + 1);
        }
        const result = await yahooFinance.chart(symbol, {
          period1: period1,
          period2: period2,
          interval: "1d",
          return: "array",
        });

        if (!result.quotes || result.quotes.length === 0) {
          for (const date of dateRange) {
            stockPrices[date] = stockPrices[date] || {};
            stockPrices[date][symbol] = await fetchPriceForDay(symbol, date);
          }
          return;
        }

        const priceMap: Record<string, { open: number; close: number }> = {};
        result.quotes.forEach((quote) => {
          const dateStr = quote.date.toISOString().split("T")[0];
          if (dateStr >= adjustedStartDate && dateStr <= adjustedEndDate) {
            priceMap[dateStr] = {
              open: quote.open || 0,
              close: quote.close || 0,
            };
          }
        });

        for (const date of dateRange) {
          stockPrices[date] = stockPrices[date] || {};
          const priceData = priceMap[date] || { open: 0, close: 0 };
          let price = Math.max(priceData.open, priceData.close);
          if (price === 0) {
            price = await fetchPriceForDay(symbol, date, priceMap);
          }
          stockPrices[date][symbol] =
            price > 0
              ? price
              : await getClosestPreviousPrice(symbol, date, priceMap);
        }
      } catch (error) {
        console.error(`Error fetching chart data for ${symbol}:`, error);
        for (const date of dateRange) {
          stockPrices[date] = stockPrices[date] || {};
          stockPrices[date][symbol] = await fetchPriceForDay(symbol, date);
        }
      }
    }),
  );

  return stockPrices;
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

function adjustDateToValidRange(dateStr: string, currentDate: string): string {
  const date = new Date(dateStr);
  const today = new Date(currentDate);
  if (date > today) {
    return currentDate;
  }
  return date.toISOString().split("T")[0];
}
