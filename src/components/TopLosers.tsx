"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/contexts/CurrencyContext";
import { batchConvertAndFormatCurrency } from "@/lib/currencyUtils";
import { useEffect, useState } from "react";

type TopLoser = {
  symbol: string;
  price: number;
  change: string;
};

interface TopLosersProps {
  topLosers: TopLoser[];
}

export default function TopLosers({ topLosers }: TopLosersProps) {
  const { preferredCurrency, isLoading, rates } = useCurrency();
  const [formattedPrices, setFormattedPrices] = useState<string[]>([]);

  useEffect(() => {
    const updateCurrencyValues = async () => {
      if (isLoading || topLosers.length === 0) return;

      const prices = topLosers.map((item) => item.price);

      const formatted = await batchConvertAndFormatCurrency(
        prices,
        "USD",
        preferredCurrency,
        "en-US",
        rates,
      );

      setFormattedPrices(formatted);
    };

    updateCurrencyValues();
  }, [topLosers, preferredCurrency, isLoading, rates]);

  return (
    <Card className="bg-true-black h-[40vh]">
      <CardHeader>
        <CardTitle>Top Losers Today</CardTitle>
      </CardHeader>
      <CardContent className="h-auto">
        <ScrollArea className="h-[30vh] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topLosers.length > 0 ? (
                topLosers.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.symbol}</TableCell>
                    <TableCell>
                      {formattedPrices[index] || "Loading..."}
                    </TableCell>
                    <TableCell>{item.change}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
