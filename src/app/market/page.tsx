// Market page

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProtectedLayout from "@/app/ProtectedLayout";
import { useSession } from "next-auth/react";
import Watchlist from "@/components/Watchlist";
import TopGainers from "@/components/TopGainers";
import TopLosers from "@/components/TopLosers";
import SearchBar from "@/components/SearchBar";
import MainMarketArea from "@/components/MainMarketArea";
import MajorIndices from "@/components/MajorIndices";
import { IExtendedAsset } from "@/types/asset";

export default function MarketPage() {
  const { data: session, status } = useSession();

  // Fetched assets data
  const [assets, setAssets] = useState<IExtendedAsset[]>([]);

  // Pagination
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Search
  const [query, setQuery] = useState<string>("");

  // Loading and error states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  // Market data
  const [topGainers, setTopGainers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);
  const [topLosers, setTopLosers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);
  const [majorIndices, setMajorIndices] = useState<
    { name: string; price: number; change: string }[]
  >([]);

  // User's watchlist
  const [watchlist, setWatchlist] = useState<
    {
      _id: string;
      asset_id: string;
      symbol: string;
      price: number;
      change: string;
    }[]
  >([]);

  // Refs for aborting fetches and refreshing watchlist
  const abortControllerRef = useRef<AbortController | null>(null);
  const watchlistRef = useRef<{ refetch: () => Promise<void> }>(null);

  // Fetch assets matching the query
  const fetchAssets = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/assets/search?query=${encodeURIComponent(query)}&page=${currentPage}&limit=50&market=true`,
        {
          credentials: "include",
          signal: controller.signal,
        },
      );
      if (!response.ok) console.error("Failed to fetch assets");
      const data = await response.json();
      setAssets(data.assets || []);
      setTotalPages(Math.ceil((data.total || 1) / 50));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Error fetching assets:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [query, currentPage]);

  // Initial assets fetch and auth check
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

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [status, session, fetchAssets]);

  // Fetch top gainers, losers and major indices
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session?.user?.id) return;

    const fetchMarketData = async () => {
      try {
        const [topResponse, indicesResponse] = await Promise.all([
          fetch("/api/market/top", { credentials: "include" }),
          fetch("/api/market/indices", { credentials: "include" }),
        ]);

        if (!topResponse.ok) console.error("Failed to fetch top movers");
        if (!indicesResponse.ok) console.error("Failed to fetch major indices");

        const { topGainers, topLosers } = await topResponse.json();
        const { indices } = await indicesResponse.json();

        setTopGainers(topGainers || []);
        setTopLosers(topLosers || []);
        setMajorIndices(indices || []);
        setMarketDataError(null);
      } catch (error) {
        console.error("Error in fetchMarketData:", error);
        setMarketDataError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    fetchMarketData();
  }, [status, session]);

  // Reset page to 1 on new search
  const handleSearch = () => {
    setCurrentPage(1);
  };

  // Handle page change for pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle adding or removing from watchlist
  const handleToggleWatchlist = useCallback(
    async (assetId: string, add: boolean) => {
      try {
        if (add) {
          const response = await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ asset_id: assetId }),
          });
          if (!response.ok) {
            console.error("Failed to add to watchlist");
          }
        } else {
          const response = await fetch(`/api/watchlist?id=${assetId}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!response.ok) {
            console.error("Failed to remove from watchlist");
          }
        }
        if (watchlistRef.current) {
          await watchlistRef.current.refetch();
        }
      } catch (error) {
        console.error("Error toggling watchlist:", error);
        throw error;
      }
    },
    [],
  );

  if (status === "loading") return <div>Loading...</div>;

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4 no-border">
        <div className="flex items-center bg-true-black rounded-lg p-4 mb-2">
          <h1 className="text-2xl font-bold">Market</h1>
          <div className="flex-1 flex justify-center">
            <div className="w-1/3">
              <SearchBar
                query={query}
                setQuery={setQuery}
                onSearch={handleSearch}
              />
            </div>
          </div>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        {marketDataError && (
          <div className="text-red-500">{marketDataError}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-[2vh]">
          <div className="col-span-1">
            <MajorIndices majorIndices={majorIndices} />
          </div>

          <div className="col-span-1 lg:col-span-3 row-span-2">
            <MainMarketArea
              assets={assets}
              currentPage={currentPage}
              totalPages={totalPages}
              loading={loading}
              onPageChange={handlePageChange}
              watchlist={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </div>

          <div className="col-span-1">
            <TopGainers topGainers={topGainers} />
          </div>

          <div className="col-span-1">
            <Watchlist ref={watchlistRef} setWatchlist={setWatchlist} />
          </div>

          <div className="col-span-1">
            <TopLosers topLosers={topLosers} />
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
