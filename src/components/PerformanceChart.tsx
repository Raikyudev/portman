"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import TimeRangeSelector from "./TimeRangeSelector";

interface PortfolioHistoryEntry {
  port_total_value: number;
  port_history_date: string;
}

interface ProfitData {
  percentage: number;
  amount: number;
}

interface PerformanceChartProps {
  portfolioId?: string;
  onPerformanceUpdate?: (value: number, profit: ProfitData) => void;
}

export default function PerformanceChart({
  portfolioId,
  onPerformanceUpdate,
}: PerformanceChartProps) {
  const [portfolioHistory, setPortfolioHistory] = useState<
    PortfolioHistoryEntry[]
  >([]);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [profit, setProfit] = useState<ProfitData>({
    percentage: 0,
    amount: 0,
  });
  const [selectedRange, setSelectedRange] = useState<string>("YTD");
  const [error, setError] = useState<string | null>(null);

  // Memoize the fetch function to prevent recreation on every render
  const fetchPortfolioHistory = useCallback(async () => {
    setError(null);
    try {
      const url = portfolioId
        ? `/api/portfolio-history/individual?range=${selectedRange}&portfolio_id=${portfolioId}`
        : `/api/portfolio-history/aggregate?range=${selectedRange}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        console.error(`Failed to fetch portfolio history: ${response.status}`);
      }

      const { data }: { data: PortfolioHistoryEntry[] } = await response.json();
      console.log("Portfolio History Data:", data);
      setPortfolioHistory(data || []);

      if (data && data.length > 0) {
        const latestValue = data[data.length - 1].port_total_value;
        const oldestValue = data[0].port_total_value || latestValue;
        const percentageChange =
          oldestValue === 0
            ? 0
            : ((latestValue - oldestValue) / oldestValue) * 100;
        const amountChange = latestValue - oldestValue;

        setPortfolioValue(latestValue);
        const profitData: ProfitData = {
          percentage: Math.round(percentageChange * 100) / 100, // 2 decimal places
          amount: Math.round(amountChange),
        };
        setProfit(profitData);
        if (onPerformanceUpdate) onPerformanceUpdate(latestValue, profitData);
      } else {
        setPortfolioValue(0);
        setProfit({ percentage: 0, amount: 0 });
        if (onPerformanceUpdate)
          onPerformanceUpdate(0, { percentage: 0, amount: 0 });
      }
    } catch (error) {
      console.error("Error in fetchPortfolioHistory:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  }, [portfolioId, selectedRange, onPerformanceUpdate]); // Dependencies are stable

  useEffect(() => {
    fetchPortfolioHistory();
  }, [fetchPortfolioHistory]); // Only depends on the memoized function

  const chartData = portfolioHistory.map((entry) => ({
    date: new Date(entry.port_history_date).toLocaleDateString(),
    value: entry.port_total_value,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="p-2 rounded"
          style={{
            backgroundColor: "hsl(348 91% 58%)",
            color: "#ffffff",
            borderRadius: "4px",
          }}
        >
          <p>{label}</p>
          <p>Value: ${payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-true-black border-none shadow-none">
      <div className="p-4 py-8">
        <TimeRangeSelector onRangeChange={setSelectedRange} />
      </div>
      <CardContent className="p-0 flex items-start">
        <div className="p-4 text-white">
          {error ? (
            <div className="text-red-500 text-sm">{error}</div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                ${portfolioValue.toLocaleString()}
              </div>
              <div
                className={`mt-2 text-sm ${profit.percentage >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {profit.percentage >= 0
                  ? `+${profit.percentage}%`
                  : `${profit.percentage}%`}
              </div>
            </>
          )}
        </div>
        <div className="flex-1 h-[27vh]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                fontSize={12}
                stroke="#ffffff"
                tick={{ fill: "#ffffff" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#FF6384"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
