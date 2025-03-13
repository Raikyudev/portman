// src/components/AssetPriceChart.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import TimeRangeSelector from "./TimeRangeSelector";
import Image from "next/image";

interface PriceData {
  date: string;
  price: number;
}

interface AssetPriceResponse {
  name: string;
  symbol: string;
  priceHistory: PriceData[];
}

interface AssetPriceChartProps {
  assetId: string;
  onClose?: () => void; // Make onClose optional
  hideCross?: boolean; // Optional prop to hide the cross button
  onSymbolFetched?: (symbol: string) => void; // Optional callback to pass the symbol
}

export default function AssetPriceChart({
  assetId,
  onClose,
  hideCross = false, // Default to false if not provided
  onSymbolFetched, // Optional callback
}: AssetPriceChartProps) {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [latestPrice, setLatestPrice] = useState(0);
  const [profit, setProfit] = useState({ percentage: 0, amount: 0 });
  const [companyName, setCompanyName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [selectedRange, setSelectedRange] = useState("YTD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPriceData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/asset-price-data?asset_id=${assetId}&period=${selectedRange}`,
          { credentials: "include" },
        );
        if (!response.ok) {
          console.error("Failed to fetch price data");
        }
        const { data }: { data: AssetPriceResponse } = await response.json();
        console.log("Fetched data:", data);

        setCompanyName(data.name || "Unknown");
        setSymbol(data.symbol || "N/A");
        setPriceData(data.priceHistory || []);

        // Pass the symbol back to the parent (AssetDetails) if callback is provided
        if (onSymbolFetched && data.symbol) {
          onSymbolFetched(data.symbol);
        }

        if (data.priceHistory && data.priceHistory.length > 0) {
          const latestValue =
            data.priceHistory[data.priceHistory.length - 1].price || 0;
          const oldestValue = data.priceHistory[0].price || latestValue;

          console.log(
            "Latest value:",
            latestValue,
            "Oldest value:",
            oldestValue,
          );

          if (oldestValue === 0 && latestValue === 0) {
            console.warn(
              "Both oldest and latest values are 0, setting defaults",
            );
            setLatestPrice(0);
            setProfit({ percentage: 0, amount: 0 });
          } else if (oldestValue === 0) {
            console.warn(
              "Oldest value is 0, cannot calculate percentage change",
            );
            setLatestPrice(latestValue);
            setProfit({ percentage: 0, amount: latestValue });
          } else {
            const percentageChange =
              ((latestValue - oldestValue) / oldestValue) * 100;
            const amountChange = latestValue - oldestValue;

            console.log(
              "Percentage change:",
              percentageChange,
              "Amount change:",
              amountChange,
            );

            setLatestPrice(latestValue);
            setProfit({
              percentage: isNaN(percentageChange)
                ? 0
                : Math.round(percentageChange),
              amount: Math.round(amountChange),
            });
          }
        } else {
          console.log("No price history available");
          setLatestPrice(0);
          setProfit({ percentage: 0, amount: 0 });
        }
      } catch (err) {
        setError("Failed to load price data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
  }, [assetId, selectedRange, onSymbolFetched]); // Added onSymbolFetched to dependency array

  const chartData = priceData.map((entry) => ({
    date: new Date(entry.date).toLocaleDateString(),
    value: entry.price || 0,
  }));

  console.log("Chart data:", chartData);

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

  if (loading) return <div>Loading price data...</div>;
  if (error) return <div>{error}</div>;

  return (
    <Card className="bg-true-black border-none shadow-none w-full h-[24vh] relative">
      <div className="p-4">
        <div className="text-white flex justify-between items-center">
          <div>
            <span className="text-2xl font-bold">{companyName}</span>
            <span className="text-xs ml-2 text-gray">{symbol}</span>
          </div>
          {!hideCross && onClose && (
            <button
              onClick={onClose}
              className="focus:outline-none"
              aria-label="Close chart"
            >
              <Image
                src="/white-cross.svg"
                alt="Close"
                width={24}
                height={24}
              />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-8">
        <TimeRangeSelector
          onRangeChange={setSelectedRange}
          initialRange={selectedRange}
        />
      </div>
      <CardContent className="p-0 flex items-start w-full">
        <div className="p-4 text-white">
          <div className="text-2xl font-bold">
            ${latestPrice.toLocaleString()}
          </div>
          <div
            className={`mt-2 text-sm ${profit.percentage >= 0 ? "text-green-500" : "text-red"}`}
          >
            {isNaN(profit.percentage)
              ? "N/A"
              : profit.percentage >= 0
                ? `+${profit.percentage}%`
                : `-${Math.abs(profit.percentage)}%`}
          </div>
        </div>
        <div className="flex-1 h-[15vh] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" fontSize={12} />
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
