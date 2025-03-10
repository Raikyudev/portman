"use client";

import { useState, useEffect } from "react";
import ProtectedLayout from "@/app/ProtectedLayout";
import { useSession } from "next-auth/react";
import Watchlist from "@/components/Watchlist";
import RecentTransactions from "@/components/RecentTransactions";
import TopHoldings from "@/components/TopHoldings";
import TopGainers from "@/components/TopGainers";
import TopLosers from "@/components/TopLosers";
import PerformanceChart from "@/components/PerformanceChart"; // Assuming this is the file path

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [topGainers, setTopGainers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);
  const [topLosers, setTopLosers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);

  // Memoize the performance update handler

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.id) {
      console.error("User is not authenticated or session user ID is missing", {
        status,
        session,
      });
      setError("Please log in to view your dashboard.");
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
        setError(null);
      } catch (error) {
        console.error("Error in fetchMarketData:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    fetchMarketData();
  }, [status, session]);

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4 no-border">
        <h1 className="text-2xl font-bold mb-4">
          Hi, {session?.user?.first_name || "User"}
        </h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 auto-rows-max">
          <Watchlist />
          <TopGainers topGainers={topGainers} />
          <TopLosers topLosers={topLosers} />
          <RecentTransactions />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceChart />

          <TopHoldings />
        </div>
      </div>
    </ProtectedLayout>
  );
}
