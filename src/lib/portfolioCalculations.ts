// @/lib/portfolioCalculations.ts
import { IExtendedTransaction } from "@/types/Transaction";

export async function calculateStockHoldings(
  transactions: IExtendedTransaction[],
  date: string,
): Promise<Record<string, number>> {
  const holdings: Record<string, number> = {};

  transactions.forEach((tx) => {
    if (new Date(tx.tx_date) <= new Date(date)) {
      if (!holdings[tx.asset_details.symbol]) {
        holdings[tx.asset_details.symbol] = 0;
      }

      if (tx.tx_type === "buy") {
        holdings[tx.asset_details.symbol] += tx.quantity;
      }
      if (tx.tx_type === "sell") {
        holdings[tx.asset_details.symbol] -= tx.quantity;
      }
    }
  });

  return holdings;
}

export function calculatePortfolioValue(
  holdings: Record<string, number>,
  stockPrices: Record<string, number>,
): number {
  let totalValue = 0;

  for (const ticker in holdings) {
    if (stockPrices[ticker]) {
      totalValue += holdings[ticker] * stockPrices[ticker];
    }
  }

  return totalValue;
}

export async function calculateStockProfits(
  transactions: IExtendedTransaction[],
  fromHoldingsWithValues: Record<string, { quantity: number; value: number }>,
  toHoldingsWithValues: Record<string, { quantity: number; value: number }>,
  fromDate: string | undefined,
  toDate: string,
): Promise<{
  periodProfits: Record<string, number>;
}> {
  const periodProfits: Record<string, number> = {};

  // Calculate period profit (change in total value, adjusted for cost of new shares)
  if (fromDate) {
    for (const symbol in toHoldingsWithValues) {
      const fromValue = fromHoldingsWithValues[symbol]?.value || 0;
      const toValue = toHoldingsWithValues[symbol]?.value || 0;

      // Step 1: Calculate the change in total value
      let periodProfit = toValue - fromValue;

      // Step 2: Subtract the cost of new shares bought between fromDate and toDate
      const quantityFrom = fromHoldingsWithValues[symbol]?.quantity || 0;
      const quantityTo = toHoldingsWithValues[symbol]?.quantity || 0;
      const newSharesBought = quantityTo - quantityFrom;

      if (newSharesBought > 0) {
        let totalCostOfNewShares = 0;
        transactions.forEach((tx) => {
          const txDate = new Date(tx.tx_date);
          if (
            tx.tx_type === "buy" &&
            tx.asset_details.symbol === symbol &&
            txDate > new Date(fromDate) &&
            txDate <= new Date(toDate)
          ) {
            totalCostOfNewShares += tx.quantity * tx.price_per_unit;
          }
        });
        periodProfit -= totalCostOfNewShares;
        console.log(`Period Profit for ${symbol}:`, {
          fromValue,
          toValue,
          changeInValue: toValue - fromValue,
          totalCostOfNewShares,
          periodProfit,
        });
      } else {
        console.log(`Period Profit for ${symbol}:`, {
          fromValue,
          toValue,
          changeInValue: toValue - fromValue,
          totalCostOfNewShares: 0,
          periodProfit,
        });
      }

      periodProfits[symbol] = periodProfit || 0; // Ensure no undefined values
    }
  }

  return { periodProfits };
}
