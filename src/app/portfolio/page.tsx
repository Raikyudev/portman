// src/app/portfolio/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { IExtendedPortfolio } from "@/types/portfolio";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import PerformanceChart from "@/components/PerformanceChart";
import RecentTransactions from "@/components/RecentTransactions";
import ProtectedLayout from "@/app/ProtectedLayout";
import PortfolioHeader from "@/components/PortfolioHeader";
import AddTransactionButton from "@/components/AddTransactionButton";
import { Button } from "@/components/ui/button";
import PortfolioAllocation from "@/components/PortfolioAllocation";
import AddPortfolioPopover from "@/components/AddPortfolioPopover";
import { useSearchParams } from "next/navigation";

interface IndividualHistoryEntry {
  portfolio_id: string;
  port_history_date: Date;
  port_total_value: number;
}

export default function Page() {
  const [portfolios, setPortfolios] = useState<IExtendedPortfolio[]>([]);
  const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [profit, setProfit] = useState<{ percentage: number; amount: number }>({
    percentage: 0,
    amount: 0,
  });
  const searchParams = useSearchParams();
  const portfolioId = searchParams.get("id");
  console.log("Portfolio ID:", portfolioId);
  const fetchPortfoliosAndHistory = useCallback(async () => {
    try {
      // Step 1: Fetch the list of portfolios
      const queryParam = portfolioId ? `?id=${portfolioId}` : "";
      const portfolioResponse = await fetch(`/api/portfolio${queryParam}`, {
        credentials: "include",
      });
      if (!portfolioResponse.ok) {
        console.error("Error fetching portfolios");
        console.error("Failed to fetch portfolios");
      }
      const portfolioDataFull = await portfolioResponse.json();
      console.log("Raw Portfolio Data:", portfolioDataFull);
      const portfolioData = portfolioId
        ? portfolioDataFull.portfolios
        : portfolioDataFull;
      const portfolioDataId = portfolioDataFull.portfolioId || false;

      // Step 2: Fetch history for each portfolio individually
      const updatedPortfolios: IExtendedPortfolio[] = await Promise.all(
        portfolioData.map(async (portfolio: IExtendedPortfolio) => {
          const historyResponse = await fetch(
            `/api/portfolio-history/individual?range=YTD&portfolio_id=${portfolio._id}`,
            {
              credentials: "include",
            },
          );
          if (!historyResponse.ok) {
            console.error(
              `Error fetching history for portfolio ${portfolio._id}`,
            );
            return { ...portfolio, port_total_value: 0 };
          }
          const { data: historyData }: { data: IndividualHistoryEntry[] } =
            await historyResponse.json();
          console.log(`History for portfolio ${portfolio._id}:`, historyData);

          const latestValue =
            historyData.length > 0
              ? historyData[historyData.length - 1].port_total_value
              : 0;
          return { ...portfolio, port_total_value: latestValue };
        }),
      );

      // Step 3: Sort portfolios by port_total_value in descending order
      updatedPortfolios.sort((a, b) => b.port_total_value - a.port_total_value);

      // Step 4: Update the portfolios state
      setPortfolios(updatedPortfolios);
      console.log(
        "Updated Portfolios (sorted by total value):",
        updatedPortfolios,
      );

      // Step 5: Set the expanded portfolio
      if (portfolioDataId) {
        console.log("Looking for new portfolio with ID:", portfolioDataId);
        console.log(
          "Portfolio IDs in updatedPortfolios:",
          updatedPortfolios.map((p) => p._id),
        );
        const newPortfolio = updatedPortfolios.find(
          (p) => String(p._id) === String(portfolioDataId),
        );
        if (newPortfolio) {
          console.log(`Selecting new portfolio: ${portfolioDataId}`);
          setExpandedPortfolio(portfolioDataId);
        } else {
          console.error(`New portfolio with ID ${portfolioDataId} not found`);
          if (updatedPortfolios.length > 0) {
            setExpandedPortfolio(updatedPortfolios[0]._id.toString());
          }
        }
      } else if (updatedPortfolios.length > 0) {
        setExpandedPortfolio(updatedPortfolios[0]._id.toString());
      }
    } catch (error) {
      console.error("Error fetching portfolios and history:", error);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchPortfoliosAndHistory();
  }, [fetchPortfoliosAndHistory, portfolioId]);

  const handlePerformanceUpdate = useCallback(
    (value: number, profitData: { percentage: number; amount: number }) => {
      console.log("Performance Update - Value:", value, "Profit:", profitData);
      setPortfolioValue(value);
      setProfit(profitData);

      // Update the port_total_value for the currently expanded portfolio
      if (expandedPortfolio) {
        setPortfolios((prevPortfolios) => {
          const updated = prevPortfolios.map((p) =>
            p._id.toString() === expandedPortfolio
              ? ({ ...p, port_total_value: value } as IExtendedPortfolio)
              : p,
          );
          // Re-sort after updating the value
          return updated.sort(
            (a, b) => b.port_total_value - a.port_total_value,
          );
        });
      }
    },
    [expandedPortfolio],
  );

  useEffect(() => {
    console.log(
      "Current State - Portfolios:",
      portfolios,
      "Expanded:",
      expandedPortfolio,
    );
  }, [portfolios, expandedPortfolio]);

  if (loading)
    return <div className="text-white">Loading portfolio data...</div>;

  const selectedPortfolio = portfolios.find(
    (p) => p._id.toString() === expandedPortfolio,
  );

  return (
    <ProtectedLayout>
      {portfolios.length > 0 ? (
        <div className="container mx-auto p-4 text-white bg-gray-900 min-h-screen flex flex-col items-center justify-center">
          {/* Entire content centered vertically */}
          <div className="w-full">
            {/* Header section */}
            <div className="flex items-center justify-between mb-4">
              <PortfolioHeader
                selectedPortfolioName={
                  selectedPortfolio?.name || "Portfolio Name"
                }
                portfolios={portfolios}
                onPortfolioSelect={setExpandedPortfolio}
                initialPortfolioId={expandedPortfolio ?? undefined}
                portfolioValue={portfolioValue}
                profit={profit}

              />
              {expandedPortfolio ? (
                <AddTransactionButton
                  portfolioId={expandedPortfolio}
                  isEnabled={true}
                />
              ) : (
                <AddTransactionButton isEnabled={false} />
              )}
            </div>
            {/* Main content */}
            <Tabs
              value={expandedPortfolio || portfolios[0]?._id.toString()}
              onValueChange={setExpandedPortfolio}
              className="w-full"
            >
              <TabsContent
                value={expandedPortfolio || portfolios[0]?._id.toString()}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 md:col-span-2 gap-4">
                  <div className="md:col-span-1">
                    <PerformanceChart
                      portfolioId={
                        expandedPortfolio || portfolios[0]?._id.toString()
                      }
                      onPerformanceUpdate={handlePerformanceUpdate}
                    />
                  </div>
                  <div>
                    {expandedPortfolio ? (
                      <RecentTransactions portfolioId={expandedPortfolio} />
                    ) : (
                      <RecentTransactions />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <PortfolioAllocation
                      portfolioId={
                        expandedPortfolio || portfolios[0]?._id.toString()
                      }
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="container mx-auto p-4 text-white bg-gray-900 min-h-screen flex flex-col items-center justify-center">
          <div>No portfolios found</div>
          <AddPortfolioPopover
            trigger={
              <Button
                variant="default"
                className="w-auto bg-red text-white mt-4 px-4 rounded-2xl"
              >
                Create new portfolio
              </Button>
            }
          />
        </div>
      )}
    </ProtectedLayout>
  );
}
