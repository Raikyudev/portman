// Top Holdings component

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
import { useSession } from "next-auth/react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { batchConvertAndFormatCurrency } from "@/lib/currencyUtils";

type Holding = {
  name: string;
  symbol: string;
  shares: number;
  value: number;
  percentage: number;
};

type TopHoldingsProps = {
  portfolioId?: string;
};

export default function TopHoldings({ portfolioId }: TopHoldingsProps = {}) {
  const { data: session, status } = useSession();
  const { preferredCurrency, isLoading, rates } = useCurrency();
  const [topHoldings, setTopHoldings] = useState<Holding[]>([]);
  const [formattedValues, setFormattedValues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch top holdings once the session is authenticated
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.id) {
      console.error("User is not authenticated or session user ID is missing", {
        status,
        session,
      });
      return;
    }

    const fetchTopHoldings = async () => {
      try {
        const url = portfolioId
          ? `/api/portfolio/top-holdings?portfolio_id=${portfolioId}`
          : "/api/portfolio/top-holdings";

        const response = await fetch(url, {
          credentials: "include",
        });
        if (!response.ok) console.error("Failed to fetch top holdings");
        const { data } = await response.json();
        setTopHoldings(data);
        setError(null);
      } catch (error) {
        console.error("Error in fetchTopHoldings:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    fetchTopHoldings();
  }, [status, session, portfolioId]);

  // Convert values to user's preferred currency
  useEffect(() => {
    const updateCurrencyValues = async () => {
      if (isLoading || topHoldings.length === 0) return;

      const values = topHoldings.map((item) => item.value);
      const formatted = await batchConvertAndFormatCurrency(
        values,
        "USD",
        preferredCurrency,
        "en-US",
        rates,
      );

      setFormattedValues(formatted);
    };

    updateCurrencyValues();
  }, [topHoldings, preferredCurrency, isLoading, rates]);

  return (
    <Card className="bg-true-black">
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
      </CardHeader>
      <CardContent className="h-auto">
        {error && <div className="text-red mb-4">{error}</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Shares</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>% of Portfolio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topHoldings.length > 0 ? (
              topHoldings.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.symbol}</TableCell>
                  <TableCell>{item.shares}</TableCell>
                  <TableCell>
                    {formattedValues[index] || "Loading..."}
                  </TableCell>
                  <TableCell>{item.percentage}%</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>No holdings available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
