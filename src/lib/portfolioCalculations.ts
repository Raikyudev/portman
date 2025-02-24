import { IExtendedTransaction } from "@/types/Transaction";

export async function calculateStockHoldings(
  transactions: IExtendedTransaction[],
  date: string,
) {
  const holdings: Record<string, number> = {};

  transactions.forEach((tx) => {
    console.log("tx:");
    console.log(tx);
    if (new Date(tx.tx_date) <= new Date(date)) {
      if (!holdings[tx.asset_details.symbol])
        holdings[tx.asset_details.symbol] = 0;

      if (tx.tx_type === "buy" && new Date(tx.tx_date) <= new Date(date)) {
        holdings[tx.asset_details.symbol] += tx.quantity;
      }
      if (tx.tx_type === "sell" && new Date(tx.tx_date) <= new Date(date)) {
        holdings[tx.asset_details.symbol] -= tx.quantity;
      }
    }
  });

  return holdings;
}

export function calculatePortfolioValue(
  holdings: Record<string, number>,
  stockPrices: Record<string, number>,
) {
  let totalValue = 0;

  for (const ticker in holdings) {
    if (stockPrices[ticker]) {
      totalValue += holdings[ticker] * stockPrices[ticker];
    }
  }

  return totalValue;
}
