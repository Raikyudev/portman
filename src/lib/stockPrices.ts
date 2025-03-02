import yahooFinance from "yahoo-finance2";
import { getDateRange } from "./utils";

export async function getStockPrices(
  holdings: Record<string, number>,
  startDate: string,
  endDate: string,
): Promise<Record<string, Record<string, number>>> {
  const stockPrices: Record<string, Record<string, number>> = {};
  const currentDate = new Date().toISOString().split("T")[0]; // Get today's date
  const adjustedStartDate = adjustDateToValidRange(startDate, currentDate); // Adjust start date if future
  const adjustedEndDate = adjustDateToValidRange(endDate, currentDate); // Adjust end date if future
  const dateRange = getDateRange(adjustedStartDate, adjustedEndDate);

  console.log(
    `Fetching prices for date range ${adjustedStartDate} to ${adjustedEndDate} for holdings: ${Object.keys(holdings).join(", ")}`,
  );

  // Fetch data for the entire range with a 365-day fallback buffer
  const period1 = new Date(adjustedStartDate);
  period1.setDate(period1.getDate() - 365); // Start 365 days before
  const period2 = new Date(adjustedEndDate);

  await Promise.all(
    Object.keys(holdings).map(async (symbol) => {
      try {
        const result = await yahooFinance.chart(symbol, {
          period1: period1,
          period2: period2,
          interval: "1d",
          return: "array", // Return as array for easier processing
        });

        if (!result.quotes || result.quotes.length === 0) {
          console.warn(
            `No quote data found for ${symbol}, using 0 for all dates`,
          );
          dateRange.forEach((date) => {
            stockPrices[date] = stockPrices[date] || {};
            stockPrices[date][symbol] = 0;
          });
          return;
        }

        // Map quotes to dates and extract close prices
        const priceMap: Record<string, number> = {};
        result.quotes.forEach((quote) => {
          const dateStr = quote.date.toISOString().split("T")[0];
          if (dateStr >= adjustedStartDate && dateStr <= adjustedEndDate) {
            priceMap[dateStr] = quote.close || 0;
          }
        });

        // Fill in missing dates with the closest previous valid price
        dateRange.forEach((date) => {
          stockPrices[date] = stockPrices[date] || {};
          let price = priceMap[date] || 0;
          if (price === 0) {
            // Look for the closest previous price
            for (let i = dateRange.indexOf(date) - 1; i >= 0; i--) {
              const prevDate = dateRange[i];
              if (priceMap[prevDate] > 0) {
                price = priceMap[prevDate];
                console.warn(
                  `Using previous valid price ${price} for ${symbol} on ${date} (from ${prevDate})`,
                );
                break;
              }
            }
          }
          stockPrices[date][symbol] = price;
          if (price > 0 && !stockPrices[date][symbol]) {
            console.log(`Found valid price ${price} for ${symbol} on ${date}`);
          }
        });
      } catch (error) {
        console.error(`Error fetching chart data for ${symbol}:`, error);
        dateRange.forEach((date) => {
          stockPrices[date] = stockPrices[date] || {};
          stockPrices[date][symbol] = 0;
        });
      }
    }),
  );

  return stockPrices;
}

// Function to get stock prices for a specific day with fallback, using holdings
export async function getStocksPriceForDay(
  holdings: Record<string, number>,
  targetDate: string,
): Promise<Record<string, number>> {
  const stockPrices: Record<string, number> = {};
  const currentDate = new Date().toISOString().split("T")[0]; // Get today's date
  const adjustedTargetDate = adjustDateToValidRange(targetDate, currentDate); // Adjust target date if future

  console.log(`Fetching prices for target date ${adjustedTargetDate}`);

  // Validate holdings
  if (!holdings || Object.keys(holdings).length === 0) {
    console.warn("Holdings is empty or undefined, returning empty prices");
    return stockPrices;
  }

  // Use a set to track processed symbols and avoid duplicate logging
  const processedSymbols = new Set<string>();

  // Fetch prices for each symbol in holdings using fetchPriceForDay
  await Promise.all(
    Object.keys(holdings).map(async (symbol) => {
      const price = await fetchPriceForDay(symbol, adjustedTargetDate);
      stockPrices[symbol] = price; // Assign price to the symbol
      if (price === 0) {
        console.warn(
          `No valid price found for ${symbol} on ${adjustedTargetDate}, using 0`,
        );
      } else if (!processedSymbols.has(symbol)) {
        console.log(
          `Found valid price ${price} for ${symbol} on or before ${adjustedTargetDate}`,
        );
        processedSymbols.add(symbol);
      }
    }),
  );

  return stockPrices;
}

// Helper function to fetch price for a specific day, with fallback to previous valid price
async function fetchPriceForDay(
  symbol: string,
  currentDate: string,
  lastKnownPrice?: number,
): Promise<number> {
  try {
    const period1 = new Date(currentDate);
    const period2 = new Date(currentDate);
    period2.setDate(period2.getDate() + 1);
    const result = await yahooFinance.chart(symbol, {
      period1: period1,
      period2: period2,
      interval: "1d",
      return: "array", // Return as array for easier processing
    });

    if (result.quotes && result.quotes.length > 0) {
      const quote = result.quotes[0];
      const price = quote.close || 0;
      if (price > 0) {
        console.log(
          `Found valid price ${price} for ${symbol} on ${currentDate}`,
        );
        return price;
      }
    }

    console.warn(
      `No valid price data found for ${symbol} on ${currentDate}, searching previous dates`,
    );
    return (
      (await getClosestPreviousPrice(symbol, currentDate)) ||
      lastKnownPrice ||
      0
    );
  } catch (error) {
    console.error(
      `Error fetching price data for ${symbol} on ${currentDate}:`,
      error,
    );
    return (
      (await getClosestPreviousPrice(symbol, currentDate)) ||
      lastKnownPrice ||
      0
    );
  }
}

// Helper function to fetch the closest previous valid price
export async function getClosestPreviousPrice(
  symbol: string,
  currentDate: string,
): Promise<number> {
  const checkDate = new Date(currentDate);
  const maxLookbackDays = 365; // Safety limit to prevent infinite loops
  let daysBack = 0;

  console.log(
    `Starting backward search for ${symbol} from ${currentDate} to max ${maxLookbackDays} days`,
  );

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
        const price = quote.close || 0;
        if (price > 0) {
          console.log(`Found valid price ${price} for ${symbol} on ${dateStr}`);
          return price;
        }
      }
      console.log(
        `No valid price found for ${symbol} on ${dateStr}, continuing search`,
      );
      daysBack++;
    } catch (error) {
      console.error(
        `Error fetching previous price for ${symbol} on ${dateStr}:`,
        error,
      );
    }
  }

  console.warn(
    `No valid price found for ${symbol} within ${maxLookbackDays} days from ${currentDate}`,
  );
  return 0; // Default to 0 if no previous price is found within the lookback limit
}

// Helper function to adjust date to valid range (not future)
function adjustDateToValidRange(dateStr: string, currentDate: string): string {
  const date = new Date(dateStr);
  const today = new Date(currentDate);
  if (date > today) {
    console.warn(
      `Requested date ${dateStr} is in the future, using ${currentDate} instead`,
    );
    return currentDate;
  }
  return date.toISOString().split("T")[0];
}
