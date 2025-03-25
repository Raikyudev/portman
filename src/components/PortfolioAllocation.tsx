"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AssetPriceChart from "@/components/AssetPriceChart";
import { useCurrency } from "@/contexts/CurrencyContext";
import { batchConvertAndFormatCurrency } from "@/lib/currencyUtils";

interface Holding {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  value: number;
  percentage: number;
}

interface PortfolioAllocationProps {
  portfolioId: string;
}

export default function PortfolioAllocation({
  portfolioId,
}: PortfolioAllocationProps) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const { preferredCurrency, isLoading, rates } = useCurrency();
  const [formattedValues, setFormattedValues] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const fetchHoldings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/portfolio/top-holdings?portfolio_id=${portfolioId}&limit=0`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          console.error("Failed to fetch top holdings");
        }

        const { data } = await response.json();
        setHoldings(data || []);
      } catch (err) {
        console.error("Error fetching holdings:", err);
        setError("Failed to load portfolio allocation");
      } finally {
        setLoading(false);
      }
    };

    if (portfolioId) {
      fetchHoldings();
    }
  }, [portfolioId]);

  useEffect(() => {
    const updateCurrencyValues = async () => {
      if (isLoading) return;

      const values = holdings.map((h) => h.value);
      const formattedValuesArray = await batchConvertAndFormatCurrency(
        values,
        "USD",
        preferredCurrency,
        "en-US",
        rates,
      );

      const newFormattedValues: Record<string, string> = {};
      holdings.forEach((holding, index) => {
        newFormattedValues[holding.id] = formattedValuesArray[index];
      });
      setFormattedValues(newFormattedValues);
    };

    updateCurrencyValues();
  }, [holdings, preferredCurrency, isLoading, rates]);

  const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value);
  const top5Holdings = sortedHoldings.slice(0, 5);
  const otherHoldings = sortedHoldings.slice(5);
  const otherPercentage = otherHoldings.reduce(
    (sum, holding) => sum + holding.percentage,
    0,
  );

  const chartData = [
    ...top5Holdings.map((holding) => ({
      id: holding.id,
      name: holding.symbol,
      value: holding.percentage,
    })),
    ...(otherHoldings.length > 0
      ? [{ name: "Other", value: Number(otherPercentage.toFixed(2)) }]
      : []),
  ];

  const COLORS = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#C0C0C0",
  ];

  const handleRowClick = (holding: Holding) => {
    setSelectedAssetId(holding.id);
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
  };

  const handleCloseChart = () => {
    setSelectedAssetId(null);
  };

  if (loading || isLoading) return <div>Loading portfolio allocation...</div>;
  if (error) return <div>{error}</div>;
  if (!holdings.length) return <div>No holdings found</div>;

  return (
    <Card className="bg-true-black text-white no-border">
      <CardHeader>
        <CardTitle>Portfolio Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
          <div className="w-1/2 p-0 m-0 flex justify-center w-full">
            {selectedAssetId ? (
              <AssetPriceChart
                assetId={selectedAssetId}
                onClose={handleCloseChart}
              />
            ) : (
              <ChartContainer
                config={{
                  percentage: {
                    label: "Percentage",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px] p-0 m-0"
              >
                <PieChart width={400} height={300}>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    labelLine={true}
                    label={({ name }) => name}
                    onClick={(data) => handleAssetSelect(data.id)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </div>
          <div className="w-1/2">
            <ScrollArea className="h-[300px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white">Symbol</TableHead>
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">Shares</TableHead>
                    <TableHead className="text-white">Value</TableHead>
                    <TableHead className="text-white">% of portfolio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHoldings.length > 0 ? (
                    sortedHoldings.map((holding, index) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(holding)}
                      >
                        <TableCell>{holding.symbol}</TableCell>
                        <TableCell>{holding.name}</TableCell>
                        <TableCell>{holding.shares}</TableCell>
                        <TableCell>
                          {formattedValues[holding.id] ||
                            holding.value.toLocaleString()}
                        </TableCell>
                        <TableCell>{holding.percentage}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>No holdings found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
