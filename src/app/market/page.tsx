// app/market/page.tsx
"use client";

import { useState, useEffect } from "react";
import ProtectedLayout from "@/app/ProtectedLayout";
import { useSession } from "next-auth/react";
import Watchlist from "@/components/Watchlist";
import TopGainers from "@/components/TopGainers";
import TopLosers from "@/components/TopLosers";
import SearchBar from "@/components/SearchBar";
import MainMarketArea from "@/components/MainMarketArea";
import { IExtendedAsset } from "@/types/asset";

export default function MarketPage() {
  const { data: session, status } = useSession();
  const [assets, setAssets] = useState<IExtendedAsset[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);
  const [topGainers, setTopGainers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);
  const [topLosers, setTopLosers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);

  // Fetch assets for the main market area (dependent on query and pagination)
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
    fetchAssets();
  }, [status, session, currentPage, query]);

  // Fetch top gainers and losers (independent of query and pagination)
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.id) {
      return; // Error already handled in the other useEffect
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
        setMarketDataError(null);
      } catch (error) {
        console.error("Error in fetchMarketData:", error);
        setMarketDataError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    fetchMarketData();
  }, [status, session]); // Only re-run when session or status changes

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/assets/search?query=${encodeURIComponent(query)}&page=${currentPage}&limit=100&market=true`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        console.error("Failed to fetch assets");
      }
      const data = await response.json();
      setAssets(data.assets || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to the first page on search
    fetchAssets(); // Trigger data fetch based on query
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (status === "loading") return <div>Loading...</div>;

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4 no-border">
        <h1 className="text-2xl font-bold mb-4">Market</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {marketDataError && (
          <div className="text-red-500 mb-4">{marketDataError}</div>
        )}

        {/* Search Bar */}
        <SearchBar query={query} setQuery={setQuery} onSearch={handleSearch} />

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Market Overview */}
          <div className="col-span-1">
            <div className="bg-true-black text-white rounded-lg p-4 h-full">
              <h2 className="text-lg font-semibold mb-2">
                Market Overview (Major Indices)
              </h2>
              {/* Placeholder content - replace with actual indices data if needed */}
              <p>Please enter a query to search for assets.</p>
            </div>
          </div>

          {/* Main Area */}
          <div className="col-span-1 lg:col-span-3 row-span-2">
            <MainMarketArea
              assets={assets}
              currentPage={currentPage}
              totalPages={totalPages}
              loading={loading}
              onPageChange={handlePageChange}
            />
          </div>

          {/* Top Gainers */}
          <div className="col-span-1">
            <TopGainers topGainers={topGainers} />
          </div>

          {/* Watchlist */}
          <div className="col-span-1">
            <Watchlist />
          </div>

          {/* Top Losers */}
          <div className="col-span-1">
            <TopLosers topLosers={topLosers} />
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
