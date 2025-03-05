import CurrencyRate from "@/models/CurrencyRate";

export async function getExchangeRate(currency1: string, currency2?: string) {
  if (currency1 === "USD") {
    return {
      base: "USD",
      currency: currency1,
      rate: 1,
    };
  }
  const c1 = currency1.toUpperCase();
  const c2 = currency2 ? currency2.toUpperCase() : "USD";

  const rates = await CurrencyRate.find({ currency: { $in: [c1] } });

  if (rates.length !== (currency2 ? 2 : 1)) {
    throw new Error("One or both currency rates not found");
  }

  const rateMap: Record<string, number> = {};

  rates.forEach((rate) => {
    rateMap[rate.currency] = rate.rate;
  });

  if (!currency2) {
    return {
      base: "USD",
      currency: c1,
      rate: rateMap[c1],
    };
  }

  const exchangeRate = rateMap[c1] / rateMap[c2];

  return {
    base: c2,
    currency: c1,
    rate: exchangeRate,
  };
}

export async function getAllCurrencyRates(): Promise<Map<string, number>> {
  const rates = await CurrencyRate.find({});

  const currencyMap = new Map<string, number>();
  currencyMap.set("USD", 1); // Set USD rate to 1 as the base

  rates.forEach((rate) => {
    currencyMap.set(rate.currency.toUpperCase(), rate.rate);
  });

  return currencyMap;
}
