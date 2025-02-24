import yahooFinance from "yahoo-finance2";

export async function getStockPrices(
  holdings: Record<string, number>,
  date: string,
) {
  const stockPrices: Record<string, number> = {};
  await Promise.all(
    Object.keys(holdings).map(async (symbol) => {
      try {
        const period1 = new Date(date);
        const period2 = new Date(date);
        period2.setDate(period2.getDate() + 1);
        const result = await yahooFinance.chart(symbol, {
          period1: period1.toISOString().split("T")[0],
          period2: period2.toISOString().split("T")[0],
          interval: "1d",
        });

        if (result?.quotes?.length > 0) {
          stockPrices[symbol] = result.quotes[0].close ?? 0;
        } else {
          console.warn(`No price data found for ${symbol} on ${date}`);
          stockPrices[symbol] = 0;
        }
      } catch (error) {
        console.error(
          `Error fetching price data for ${symbol} on ${date}:`,
          error,
        );
        stockPrices[symbol] = 0;
      }
    }),
  );

  return stockPrices;
}
