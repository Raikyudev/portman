// Portfolio calculations utils file

import { IExtendedTransaction } from "@/types/Transaction";

// Calculate stock holdings at a specific date
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

// Calculate total portfolio value based on holdings and stock prices
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

// Calculate profits over a period, adjusting for new purchases
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

  if (fromDate) {
    for (const symbol in toHoldingsWithValues) {
      const fromValue = fromHoldingsWithValues[symbol]?.value || 0;
      const toValue = toHoldingsWithValues[symbol]?.value || 0;

      // Change in total value
      let periodProfit = toValue - fromValue;

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
        // Adjust profit by subtracting cost of new shares
        periodProfit -= totalCostOfNewShares;
      } else {
      }

      periodProfits[symbol] = periodProfit || 0;
    }
  }

  return { periodProfits };
}
