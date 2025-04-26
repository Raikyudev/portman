// All transactions window component

"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/contexts/CurrencyContext";
import { batchConvertAndFormatCurrency } from "@/lib/currencyUtils";

interface Transaction {
  date: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
}

interface AllTransactionsProps {
  portfolioId?: string;
}

export default function AllTransactions({
  portfolioId,
}: AllTransactionsProps = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { preferredCurrency, isLoading, rates } = useCurrency();
  const [formattedPrices, setFormattedPrices] = useState<
    Record<string, { price: string; total: string }>
  >({});

  // Fetch all transactions for the user or selected portfolio
  useEffect(() => {
    const fetchAllTransactions = async () => {
      setLoading(true);
      try {
        const url = portfolioId
          ? `/api/transactions?portfolio_id=${portfolioId}`
          : "/api/transactions";

        const response = await fetch(url, {
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("All Transactions API failed:", {
            status: response.status,
            error: data.error || "Unknown error",
          });
          setError("Failed to load all transactions");
          return;
        }

        const { data } = await response.json();
        setTransactions(data || []);
        setError(null);
      } catch (error) {
        console.error("Error in fetchAllTransactions:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllTransactions();
  }, [portfolioId]);

  // Update prices and totals to user's preferred currency
  useEffect(() => {
    const updateCurrencyValues = async () => {
      if (isLoading) return;

      const prices = transactions.map((t) => t.price);
      const totals = transactions.map((t) => t.total);

      const formattedPricesArray = await batchConvertAndFormatCurrency(
        prices,
        "USD",
        preferredCurrency,
        "en-US",
        rates,
      );
      const formattedTotalsArray = await batchConvertAndFormatCurrency(
        totals,
        "USD",
        preferredCurrency,
        "en-US",
        rates,
      );

      const newFormattedValues: Record<
        string,
        { price: string; total: string }
      > = {};
      transactions.forEach((_, index) => {
        newFormattedValues[index] = {
          price: formattedPricesArray[index],
          total: formattedTotalsArray[index],
        };
      });
      setFormattedPrices(newFormattedValues);
    };

    updateCurrencyValues();
  }, [transactions, preferredCurrency, isLoading, rates]);

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 text-white">All Transactions</h2>
      {error && <div className="text-red mb-4">{error}</div>}
      <ScrollArea className="h-[calc(80vh-12rem)] max-h-full w-full p-2">
        {loading || isLoading ? (
          <p className="text-gray-300">Loading all transactions...</p>
        ) : (
          <Table className="w-full table-auto no-border">
            <TableHeader className="sticky">
              <TableRow className="bg-black top-0 z-10">
                <TableHead className="w-1/6 text-left">Date</TableHead>
                <TableHead className="w-1/6 text-left">Symbol</TableHead>
                <TableHead className="w-1/6 text-left">Type</TableHead>
                <TableHead className="w-1/6 text-right">Quantity</TableHead>
                <TableHead className="w-1/6 text-right">Price</TableHead>
                <TableHead className="w-1/6 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-left">{item.date}</TableCell>
                    <TableCell className="text-left">{item.symbol}</TableCell>
                    <TableCell className="text-left">{item.type}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formattedPrices[index]?.price ||
                        item.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formattedPrices[index]?.total ||
                        item.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No transactions available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
