// pages/api/market/top/route.ts
import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET() {
  try {
    // Fetch top gainers using dailyGainers with validation disabled
    const gainersResponse = await yahooFinance.dailyGainers(
      { count: 10 },
      { validateResult: false }, // Disable validation
    );
    if (!gainersResponse || !gainersResponse.quotes) {
      console.warn("No gainers quotes available, response:", gainersResponse);
    }
    const topGainersData = (gainersResponse.quotes || []).map(
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

    // Fetch top losers using screener with day_losers
    const losersResponse = await yahooFinance.screener(
      { scrIds: "day_losers", count: 10 },
      { validateResult: false }, // Disable validation
    );
    if (!losersResponse || !losersResponse.quotes) {
      console.warn("No losers quotes available, response:", losersResponse);
    }
    const topLosersData = (losersResponse.quotes || []).map(
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

    return NextResponse.json(
      {
        topGainers: topGainersData.slice(0, 10),
        topLosers: topLosersData.slice(0, 10),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching market data:" + error);
    return NextResponse.json(
      { error: "Failed to fetch market data" + error },
      { status: 500 },
    );
  }
}
