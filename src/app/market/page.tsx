"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [watchlist, setWatchlist] = useState<
    {
      _id: string;
      asset_id: string;
      symbol: string;
      price: number;
      change: string;
    }[]
  >([]); // Initialize as empty array

  const abortControllerRef = useRef<AbortController | null>(null);
  const watchlistRef = useRef<{ refetch: () => Promise<void> }>(null); // Ref to access Watchlist's refetch method

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
        console.log("Fetch aborted");
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

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.id) return;

    const fetchMarketData = async () => {
      try {
        const response = await fetch("/api/market/top", {
          credentials: "include",
        });
        if (!response.ok) console.error("Failed to fetch market data");
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
  }, [status, session]);

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
        // Trigger refetch in Watchlist component
        if (watchlistRef.current) {
          await watchlistRef.current.refetch();
        }
      } catch (error) {
        console.error("Error toggling watchlist:", error);
        throw error; // Propagate error to WatchlistButton
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
            <div className="bg-true-black text-white rounded-lg p-4 h-full">
              <h2 className="text-lg font-semibold mb-2">
                Market Overview (Major Indices)
              </h2>
              <p>Please enter a query to search for assets.</p>
            </div>
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
