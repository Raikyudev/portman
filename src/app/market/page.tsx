"use client";

import { useState, useEffect } from "react";
import ProtectedLayout from "@/app/ProtectedLayout";
import { useSession } from "next-auth/react";
import Watchlist from "@/components/Watchlist";
import TopGainers from "@/components/TopGainers";
import TopLosers from "@/components/TopLosers";

interface MarketIndex {
  symbol: string;
  price: number;
  change: string;
}

export default function MarketPage() {
  const { data: session, status } = useSession();
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [topGainers, setTopGainers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);
  const [topLosers, setTopLosers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.id) {
      console.error("User is not authenticated or session user ID is missing", {
        status,
        session,
      });
      setError("Please log in to view the market page.");
      return;
    }

    const fetchMarketData = async () => {
      try {
        const response = await fetch("/api/market/top", {
          credentials: "include",
        });
        if (!response.ok) {
          console.error("Failed to fetch market data");
        }
        const { topGainers, topLosers } = await response.json();
        setTopGainers(topGainers || []);
        setTopLosers(topLosers || []);
      } catch (error) {
        console.error("Error in fetchMarketData:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    const fetchMarketIndices = async () => {
      try {
        const response = await fetch("/api/market/indices", {
          credentials: "include",
        });
        if (!response.ok) {
          console.error("Failed to fetch market indices");
        }
        const { data } = await response.json();
        setMarketIndices(data || []);
      } catch (error) {
        console.error("Error in fetchMarketIndices:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    fetchMarketData();
    fetchMarketIndices();
  }, [status, session]);

  if (status === "loading") return <div>Loading...</div>;

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4 no-border">
        <h1 className="text-2xl font-bold mb-4">Market</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-5 grid-rows-2 gap-4">
          {/* Market Overview (Top-left) */}
          <div className="col-span-1 row-span-1">
            <div className="bg-true-black text-white rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">
                Market Overview (Major Indices)
              </h2>
              {marketIndices.length > 0 ? (
                <div className="space-y-2">
                  {marketIndices.map((index, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center"
                    >
                      <span>{index.symbol}</span>
                      <span>${index.price.toLocaleString()}</span>
                      <span
                        className={
                          parseFloat(index.change) >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {index.change}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>No market indices available.</div>
              )}
            </div>
          </div>

          {/* Placeholder Div (Center, spanning 2 rows) */}
          <div className="col-span-1 lg:col-span-3 row-span-2">
            <div className="bg-true-black text-white rounded-lg p-4 h-full flex flex-col justify-center items-center">
              <h2 className="text-lg font-semibold mb-2">
                Placeholder (2 Rows)
              </h2>
              <p className="text-gray-400">
                This section will be replaced with a new component.
              </p>
            </div>
          </div>
          <TopGainers topGainers={topGainers} />
          <Watchlist />
          <TopLosers topLosers={topLosers} />
        </div>
      </div>
    </ProtectedLayout>
  );
}
