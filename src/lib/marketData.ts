import yahooFinance from "yahoo-finance2";

export async function fetchTopGainersAndLosers() {
  try {
    // Fetch top gainers using dailyGainers (confirmed in --help)
    const gainersResponse = await yahooFinance.dailyGainers({ count: 5 });
    const gainersQuotes = gainersResponse.quotes || [];
    const topGainersData = gainersQuotes.map(
      (quote: {
        symbol: string;
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
      }) => ({
        symbol: quote.symbol,
        price: quote.regularMarketPrice || 0,
        change: `${(quote.regularMarketChangePercent || 0).toFixed(2)}%`,
      }),
    );

    // Fetch top losers using screener with day_losers predefined ID
    const losersResponse = await yahooFinance.screener(
      { scrIds: "day_losers", count: 5 },
      {},
    );
    const losersQuotes = losersResponse.quotes || [];
    const topLosersData = losersQuotes.map(
      (quote: {
        symbol: string;
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
      }) => ({
        symbol: quote.symbol,
        price: quote.regularMarketPrice || 0,
        change: `${(quote.regularMarketChangePercent || 0).toFixed(2)}%`,
      }),
    );

    return {
      topGainers: topGainersData.slice(0, 1),
      topLosers: topLosersData.slice(0, 1),
    };
  } catch (error) {
    console.error("Error with gainers/losers fetch:", error);

    // Fallback: Use watchlist approach
    const watchlist = ["AAPL", "TSLA", "MSFT", "NVDA", "GOOGL"];
    const period1 = new Date();
    period1.setDate(period1.getDate() - 5);
    const period2 = new Date();

    const results = await Promise.all(
      watchlist.map(async (symbol) => {
        const result = await yahooFinance.chart(symbol, {
          period1,
          period2,
          interval: "1d",
          return: "array",
        });
        if (result.quotes && result.quotes.length > 0) {
          const latestQuote = result.quotes[result.quotes.length - 1];
          const prevQuote =
            result.quotes.length > 1
              ? result.quotes[result.quotes.length - 2]
              : latestQuote;
          const price = latestQuote.close || 0;
          const prevPrice = prevQuote.close || price;
          const changePercent = ((price - prevPrice) / prevPrice) * 100 || 0;
          const changeStr = `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`;
          return { symbol, price, change: changeStr };
        }
        return { symbol, price: 0, change: "0.00%" };
      }),
    );

    const gainers = results
      .filter((r) => r.price > 0)
      .sort((a, b) => {
        const changeA = parseFloat(a.change);
        const changeB = parseFloat(b.change);
        return changeB - changeA;
      })
      .slice(0, 1);
    const losers = results
      .filter((r) => r.price > 0)
      .sort((a, b) => {
        const changeA = parseFloat(a.change);
        const changeB = parseFloat(b.change);
        return changeA - changeB;
      })
      .slice(0, 1);

    return {
      topGainers: gainers,
      topLosers: losers,
    };
  }
}
