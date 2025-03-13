// src/components/AssetDetails.tsx
"use client";

import AssetPriceChart from "./AssetPriceChart";
import WatchlistButton from "./WatchlistButton"; // Import WatchlistButton
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState, useEffect } from "react";

// Utility function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toFixed(2)}`;
};

// Utility function to format percentage
const formatPercentage = (num: number): string => {
  return `${(num * 100).toFixed(2)}%`;
};

interface AssetDetailsProps {
  assetId: string;
  onClose: () => void;
  watchlist?: {
    _id: string;
    asset_id: string;
    symbol: string;
    price: number;
    change: string;
  }[]; // Optional watchlist prop
  onToggleWatchlist?: (assetId: string, add: boolean) => Promise<void>; // Optional toggle function
}

interface AssetDetailsData {
  marketCap: number;
  volume24h: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingPE: number;
  trailingAnnualDividendYield: number;
}

export default function AssetDetails({
  assetId,
  onClose,
  watchlist = [],
  onToggleWatchlist,
}: AssetDetailsProps) {
  const [details, setDetails] = useState<AssetDetailsData>({
    marketCap: 0,
    volume24h: 0,
    fiftyTwoWeekHigh: 0,
    fiftyTwoWeekLow: 0,
    trailingPE: 0,
    trailingAnnualDividendYield: 0,
  });
  const [symbol, setSymbol] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (symbol) {
        try {
          const response = await fetch(`/api/assets/details?symbol=${symbol}`, {
            credentials: "include",
          });
          if (!response.ok) {
            console.error("Failed to fetch asset details");
            return;
          }
          const { data } = await response.json();
          setDetails(data);
        } catch (err) {
          console.error("Error fetching asset details:", err);
        }
      }
    };

    fetchDetails();
  }, [symbol]);

  return (
    <Card className="bg-true-black text-white p-4 rounded-lg relative h-[74vh] flex flex-col justify-between overflow-y-auto">
      <CardContent
        className="p-0 w-full flex flex-col justify-between h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Back Button and Watchlist Button */}
        <div className="p-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-gray-800"
            aria-label="Close Asset Details"
          >
            <Image
              src="/white-arrow.svg"
              alt="Back Arrow"
              width={32}
              height={32}
              className="bg-black hover:bg-red rounded-md"
            />
          </Button>
          {symbol && onToggleWatchlist && (
            <WatchlistButton
              symbol={symbol}
              watchlist={watchlist.map((item) => item.symbol)}
              onToggleWatchlist={() =>
                onToggleWatchlist(
                  assetId,
                  !watchlist.some((item) => item.asset_id === assetId),
                )
              }
            />
          )}
        </div>

        {/* Asset Price Chart - Centered Vertically */}
        <div className="flex-1 flex items-center justify-center w-full">
          <AssetPriceChart
            assetId={assetId}
            hideCross={true}
            onSymbolFetched={setSymbol}
          />
        </div>

        {/* Additional Details - At the Bottom with 6 Fields */}
        <div className="p-4 border-t border-gray-700 w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-2">Additional Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Market Cap</p>
              <p className="text-lg">{formatNumber(details.marketCap)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Volume (24h)</p>
              <p className="text-lg">{formatNumber(details.volume24h)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">52 Week High</p>
              <p className="text-lg">
                {formatNumber(details.fiftyTwoWeekHigh)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">52 Week Low</p>
              <p className="text-lg">{formatNumber(details.fiftyTwoWeekLow)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">P/E Ratio</p>
              <p className="text-lg">{details.trailingPE.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Dividend Yield</p>
              <p className="text-lg">
                {formatPercentage(details.trailingAnnualDividendYield)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
