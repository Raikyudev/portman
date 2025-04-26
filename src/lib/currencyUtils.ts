// Currency utility functions

import { CURRENCY_SYMBOLS, Currency } from "./constants";
import { getAllCurrencyRates } from "./currencyExchange";

// Convert a single amount between currencies
export async function convertCurrency(
  amount: number,
  fromCurrency: string = "USD",
  toCurrency: Currency,
  rates?: Map<string, number>,
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const rateMap = rates || (await getAllCurrencyRates());
  const rate = rateMap.get(toCurrency.toUpperCase());

  if (rate === undefined) {
    console.warn(
      `No exchange rate found for ${toCurrency}, returning original amount`,
    );
    return amount;
  }

  return amount * rate;
}

// Format a number into currency string
export function formatCurrency(
  amount: number,
  currency: Currency,
  locale: string = "en-US",
): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formattedAmount}`;
}

// Convert and format a single ammount
export async function convertAndFormatCurrency(
  amount: number,
  fromCurrency: string = "USD",
  toCurrency: Currency,
  locale: string = "en-US",
  rates?: Map<string, number>,
): Promise<string> {
  const convertedAmount = await convertCurrency(
    amount,
    fromCurrency,
    toCurrency,
    rates,
  );
  return formatCurrency(convertedAmount, toCurrency, locale);
}

// Batch convert and format multiple amounts
export async function batchConvertAndFormatCurrency(
  amounts: number[],
  fromCurrency: string = "USD",
  toCurrency: Currency,
  locale: string = "en-US",
  rates?: Map<string, number>,
): Promise<string[]> {
  const rateMap = rates || (await getAllCurrencyRates());
  const rate = rateMap.get(toCurrency.toUpperCase()) || 1;

  const convertedAmounts = amounts.map((amount) => {
    if (fromCurrency === toCurrency) return amount;
    return amount * rate;
  });

  return convertedAmounts.map((amount) =>
    formatCurrency(amount, toCurrency, locale),
  );
}
