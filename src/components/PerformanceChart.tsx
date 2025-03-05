"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import TimeRangeSelector from "./TimeRangeSelector";

interface PerformanceChartProps {
  portfolioId: string;
}

export default function PerformanceChart({
  portfolioId,
}: PerformanceChartProps) {
  const [portfolioHistory, setPortfolioHistory] = useState<
    { port_total_value: number; port_history_date: string }[]
  >([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [profitLoss, setProfitLoss] = useState({ percentage: 0, amount: 0 });
  const [selectedRange, setSelectedRange] = useState("YTD");

  useEffect(() => {
    const fetchPortfolioHistory = async () => {
      try {
        const response = await fetch(
          `/api/portfolio-history/individual?range=${selectedRange}&portfolio_id=${portfolioId}`,
          {
            credentials: "include",
          },
        );
        if (!response.ok) console.error("Failed to fetch portfolio history");

        const { data } = await response.json();
        setPortfolioHistory(data || []);

        if (data.length > 0) {
          const latestValue = data[data.length - 1].port_total_value;
          setPortfolioValue(latestValue);
          const oldestValue = data[0].port_total_value || latestValue;
          const percentageChange =
            ((latestValue - oldestValue) / oldestValue) * 100;
          const amountChange = latestValue - oldestValue;
          setProfitLoss({
            percentage: Math.round(percentageChange),
            amount: Math.round(amountChange),
          });
        }
      } catch (error) {
        console.error("Error in fetchPortfolioHistory:", error);
      }
    };

    fetchPortfolioHistory();
  }, [portfolioId, selectedRange]);

  const chartData = portfolioHistory.map((entry) => ({
    date: new Date(entry.port_history_date).toLocaleDateString(),
    value: entry.port_total_value,
  }));

  // Custom tooltip content to ensure white text
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
          <div className="text-2xl font-bold">
            ${portfolioValue.toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {profitLoss.percentage}%
          </div>
        </div>
        <div className="flex-1 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#FF6384" // Red color to match screenshot
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
