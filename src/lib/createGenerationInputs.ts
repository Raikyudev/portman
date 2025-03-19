import { getTransactions } from "@/lib/transactions";
import { getPortfolios } from "@/lib/portfolioDetails";
import {
  calculatePortfolioValue,
  calculateStockHoldings,
  calculateStockProfits,
} from "@/lib/portfolioCalculations";
import { getStocksPriceForDay } from "@/lib/stockPrices";
import { PortfolioData, PortfolioHoldings } from "@/types/portfolio";

interface GenerationInputParams {
  portfolio_ids: string[];
  report_type: "income_report" | "portfolio_report" | "summary";
  from_date?: Date;
  to_date: Date;
}

export async function createGenerationInputs(
  params: GenerationInputParams,
): Promise<PortfolioData> {
  const { portfolio_ids, report_type, from_date, to_date } = params;

  const formattedFromDate = from_date
    ? from_date.toISOString().split("T")[0]
    : undefined;
  const formattedToDate = to_date.toISOString().split("T")[0];

  // Fetch portfolio details (name and description)
  const portfolioDetails = await getPortfolios(portfolio_ids);
  const portfolios = portfolioDetails.map((portfolio) => ({
    _id: portfolio._id.toString(),
    name: portfolio.name,
    description: portfolio.description || "",
  }));

  // Initialize portfolio holdings object
  const portfolioHoldings: Record<string, PortfolioHoldings> = {};

  for (const portfolioId of portfolio_ids) {
    const transactions = await getTransactions(portfolioId);

    if (!transactions || transactions.length === 0) {
      portfolioHoldings[portfolioId] = {
        stockHoldingsFrom: {},
        stockHoldingsTo: {},
        portfolioValueFrom: 0,
        portfolioValueTo: 0,
        periodProfits: {},
      };
      continue;
    }

    // Calculate holdings for fromDate if provided
    const stockHoldingsFrom = formattedFromDate
      ? await calculateStockHoldings(transactions, formattedFromDate)
      : {};
    const stockPricesFrom = formattedFromDate
      ? await getStocksPriceForDay(stockHoldingsFrom, formattedFromDate)
      : {};
    const portfolioValueFrom = formattedFromDate
      ? calculatePortfolioValue(stockHoldingsFrom, stockPricesFrom)
      : 0;

    // Calculate holdings for toDate
    const stockHoldingsTo = await calculateStockHoldings(
      transactions,
      formattedToDate,
    );
    const stockPricesTo = await getStocksPriceForDay(
      stockHoldingsTo,
      formattedToDate,
    );
    const portfolioValueTo = calculatePortfolioValue(
      stockHoldingsTo,
      stockPricesTo,
    );

    // Transform holdings to include quantity and value
    const stockHoldingsFromWithValues: Record<
      string,
      { quantity: number; value: number }
    > = {};
    const stockHoldingsToWithValues: Record<
      string,
      { quantity: number; value: number }
    > = {};

    if (formattedFromDate) {
      for (const symbol in stockHoldingsFrom) {
        const quantity = stockHoldingsFrom[symbol];
        const price = stockPricesFrom[symbol] || 0;
        const value = quantity * price;
        stockHoldingsFromWithValues[symbol] = { quantity, value };
      }
    }

    for (const symbol in stockHoldingsTo) {
      const quantity = stockHoldingsTo[symbol];
      const price = stockPricesTo[symbol] || 0;
      const value = quantity * price;
      stockHoldingsToWithValues[symbol] = { quantity, value };
    }

    // Calculate profits
    const { periodProfits } = await calculateStockProfits(
      transactions,
      stockHoldingsFromWithValues,
      stockHoldingsToWithValues,
      formattedFromDate,
      formattedToDate,
    );

    portfolioHoldings[portfolioId] = {
      stockHoldingsFrom: stockHoldingsFromWithValues,
      stockHoldingsTo: stockHoldingsToWithValues,
      portfolioValueFrom,
      portfolioValueTo,
      periodProfits,
    };
  }

  return {
    fromDate: formattedFromDate,
    toDate: formattedToDate,
    reportType: report_type,
    portfolios,
    portfolioHoldings,
  };
}
