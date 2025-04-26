// Major Indices component

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

type MajorIndex = {
  name: string;
  price: number;
  change: string;
};

interface MajorIndicesProps {
  majorIndices: MajorIndex[];
}

export default function MajorIndices({ majorIndices }: MajorIndicesProps) {
  const { preferredCurrency, isLoading, rates } = useCurrency();
  const [formattedPrices, setFormattedPrices] = useState<string[]>([]);

  // Update currency values when indices change
  useEffect(() => {
    const updateCurrencyValues = async () => {
      if (isLoading || majorIndices.length === 0) return;

      const prices = majorIndices.map((item) => item.price);

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
  }, [majorIndices, preferredCurrency, isLoading, rates]);

  return (
    <Card className="bg-true-black h-[40vh]">
      <CardHeader>
        <CardTitle>Major Indices</CardTitle>
      </CardHeader>
      <CardContent className="h-auto">
        <ScrollArea className="h-[30vh] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Index</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {majorIndices.length > 0 ? (
                majorIndices.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {formattedPrices[index] || "Loading..."}
                    </TableCell>
                    <TableCell>{item.change}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>Loading data...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
