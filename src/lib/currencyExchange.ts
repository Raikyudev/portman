let exchangeRateCache: Map<
  string,
  { base: string; currency: string; rate: number }
> = new Map();
let allCurrencyRatesCache: Map<string, number> | null = null;
let serverExchangeRatesCache: Map<string, number> | null = null;
const CACHE_DURATION = 60 * 60 * 1000;
let exchangeRateLastFetched: number | null = null;
let allCurrencyRatesLastFetched: number | null = null;
let serverExchangeRatesLastFetched: number | null = null;

export async function getExchangeRate(currency1: string, currency2?: string) {
  const cacheKey = `${currency1}-${currency2 || "USD"}`;
  const now = Date.now();

  if (
    exchangeRateCache.has(cacheKey) &&
    exchangeRateLastFetched &&
    now - exchangeRateLastFetched < CACHE_DURATION
  ) {
    return exchangeRateCache.get(cacheKey);
  }

  const url = currency2
    ? `/api/currency/get?currency1=${currency1}&currency2=${currency2}`
    : `/api/currency/get?currency1=${currency1}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(data.message || "Failed to fetch exchange rate");
    }

    exchangeRateCache.set(cacheKey, data);
    exchangeRateLastFetched = now;
    return data;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    const fallback = {
      base: currency2 || "USD",
      currency: currency1.toUpperCase(),
      rate: 1,
    };
    exchangeRateCache.set(cacheKey, fallback);
    exchangeRateLastFetched = now;
    return fallback;
  }
}

export async function getAllCurrencyRates(): Promise<Map<string, number>> {
  const now = Date.now();

  if (
    allCurrencyRatesCache &&
    allCurrencyRatesLastFetched &&
    now - allCurrencyRatesLastFetched < CACHE_DURATION
  ) {
    return allCurrencyRatesCache;
  }

  try {
    const response = await fetch("http://localhost:3000/api/currency/get-all");
    const data = await response.json();

    if (!response.ok) {
      console.error(data.error || "Failed to fetch currency rates");
    }

    const currencyMap = new Map<string, number>();
    Object.entries(data.rates).forEach(([currency, rate]) => {
      currencyMap.set(currency.toUpperCase(), rate as number);
    });

    allCurrencyRatesCache = currencyMap;
    allCurrencyRatesLastFetched = now;
    return currencyMap;
  } catch (error) {
    console.error("Error fetching currency rates:", error);
    const fallbackMap = new Map<string, number>();
    fallbackMap.set("USD", 1);
    allCurrencyRatesCache = fallbackMap;
    allCurrencyRatesLastFetched = now;
    return fallbackMap;
  }
}

export async function getServerExchangeRates(
  request: Request,
): Promise<Map<string, number>> {
  const now = Date.now();

  if (
    serverExchangeRatesCache &&
    serverExchangeRatesLastFetched &&
    now - serverExchangeRatesLastFetched < CACHE_DURATION
  ) {
    return serverExchangeRatesCache;
  }

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const url = `${protocol}://${host}/api/currency/get-all`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(data.error || "Failed to fetch currency rates");
    }

    const currencyMap = new Map<string, number>();
    Object.entries(data.rates).forEach(([currency, rate]) => {
      currencyMap.set(currency.toUpperCase(), rate as number);
    });

    serverExchangeRatesCache = currencyMap;
    serverExchangeRatesLastFetched = now;
    return currencyMap;
  } catch (error) {
    console.error("Error fetching server currency rates:", error);
    const fallbackMap = new Map<string, number>();
    fallbackMap.set("USD", 1);
    serverExchangeRatesCache = fallbackMap;
    serverExchangeRatesLastFetched = now;
    return fallbackMap;
  }
}
