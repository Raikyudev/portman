// Recent Transactions component

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PopoutWindow from "./PopoutWindow";
import AllTransactions from "./AllTransactions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

interface RecentTransactionsProps {
  portfolioId?: string;
}

export default function RecentTransactions({
  portfolioId,
}: RecentTransactionsProps = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const { preferredCurrency, isLoading, rates } = useCurrency();
  const [formattedPrices, setFormattedPrices] = useState<
    Record<string, { price: string; total: string }>
  >({});

  // Fetch recent transactions
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      setLoading(true);
      try {
        const url = portfolioId
          ? `/api/transactions?portfolio_id=${portfolioId}&limit=5`
          : "/api/transactions?limit=5";

        const response = await fetch(url, {
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("Transactions API failed:", {
            status: response.status,
            error: data.error || "Unknown error",
          });
          setError("Failed to load transactions");
          return;
        }

        const { data } = await response.json();

        setTransactions(data || []);
        setError(null);
      } catch (error) {
        console.error("Error in fetchRecentTransactions:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTransactions();
  }, [portfolioId]);

  // Convert transaction prices to user's preferred currency
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

  // Open full transactions popout
  const openPopout = () => {
    setIsPopoutOpen(true);
  };

  // Close full transactions popout
  const closePopout = () => {
    setIsPopoutOpen(false);
  };

  return (
    <Card className="no-border bg-true-black">
      <CardHeader className="flex flex-row items-center justify-between pt-6 space-y-0 no-border">
        <CardTitle>Recent Transactions</CardTitle>
        <Button
          onClick={openPopout}
          className="bg-red text-white hover:text-true-black"
          size="sm"
        >
          View All Transactions
        </Button>
      </CardHeader>
      <CardContent className="h-auto">
        {error && <div className="text-red mb-4">{error}</div>}
        {loading || isLoading ? (
          <p>Loading transactions...</p>
        ) : (
          <ScrollArea className="h-[28vh] w-full overflow-x-auto no-border overflow-x-auto whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.symbol}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {formattedPrices[index]?.price ||
                          item.price.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {formattedPrices[index]?.total ||
                          item.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6}>No recent transactions</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation={"horizontal"} />
          </ScrollArea>
        )}
        <PopoutWindow isOpen={isPopoutOpen} onClose={closePopout}>
          <AllTransactions portfolioId={portfolioId} />
        </PopoutWindow>
      </CardContent>
    </Card>
  );
}
