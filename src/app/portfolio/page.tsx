"use client";

import { useState, useEffect, useCallback } from "react";
import { IExtendedPortfolio } from "@/types/portfolio";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import PerformanceChart from "@/components/PerformanceChart";
import RecentTransactions from "@/components/RecentTransactions"; // Add this import
import ProtectedLayout from "@/app/ProtectedLayout";
import PortfolioHeader from "@/components/PortfolioHeader";
import AddTransactionButton from "@/components/AddTransactionButton";

interface AggregateHistoryEntry {
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

  const fetchPortfoliosAndHistory = useCallback(async () => {
    try {
      const portfolioResponse = await fetch("/api/portfolio", {
        credentials: "include",
      });
      if (!portfolioResponse.ok) console.error("Error fetching portfolios");
      const portfolioData = await portfolioResponse.json();

      const historyResponse = await fetch("/api/portfolio-history/aggregate", {
        credentials: "include",
      });
      if (!historyResponse.ok) console.error("Error fetching history");
      const { data: historyData }: { data: AggregateHistoryEntry[] } =
        await historyResponse.json();

      const updatedPortfolios: IExtendedPortfolio[] = portfolioData.map(
        (portfolio: IExtendedPortfolio) => {
          const portfolioHistory = historyData.filter(
            (entry) => entry.portfolio_id === portfolio._id.toString(),
          );
          const latestValue =
            portfolioHistory.length > 0
              ? portfolioHistory[portfolioHistory.length - 1].port_total_value
              : 0;
          return { ...portfolio, port_total_value: latestValue };
        },
      );

      setPortfolios(updatedPortfolios);
      console.log("Updated Portfolios:", updatedPortfolios);

      if (updatedPortfolios.length > 0) {
        setExpandedPortfolio(updatedPortfolios[0]._id.toString());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfoliosAndHistory();
  }, [fetchPortfoliosAndHistory]);

  const handlePerformanceUpdate = useCallback(
    (value: number, profitData: { percentage: number; amount: number }) => {
      console.log("Performance Update - Value:", value, "Profit:", profitData);
      setPortfolioValue(value);
      setProfit(profitData);
    },
    [],
  );

  useEffect(() => {
    console.log(
      "Current State - Portfolios:",
      portfolios,
      "Expanded:",
      expandedPortfolio,
    );
  }, [portfolios, expandedPortfolio]);

  if (loading) return <p>Loading...</p>;

  const selectedPortfolio = portfolios.find(
    (p) => p._id.toString() === expandedPortfolio,
  );

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4 text-white bg-gray-900 min-h-screen">
        <PortfolioHeader
          selectedPortfolioName={selectedPortfolio?.name || "Portfolio Name"}
          earnings={`Earnings ${profit.percentage}% ($${profit.amount.toLocaleString()})`}
          portfolioValue={`Portfolio Value $${portfolioValue.toLocaleString()}`}
          portfolios={portfolios}
          onPortfolioSelect={setExpandedPortfolio}
          initialPortfolioId={expandedPortfolio ?? undefined}
        />
        {portfolios.length > 0 && (
          <Tabs
            value={expandedPortfolio || portfolios[0]?._id.toString()}
            onValueChange={setExpandedPortfolio}
            className="w-full"
          >
            <TabsContent
              value={expandedPortfolio || portfolios[0]?._id.toString()}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 md: col-span-2 gap-4">
                {/* Performance Chart (2/3 width on medium screens and up) */}
                <div className="md:col-span-1">
                  <PerformanceChart
                    portfolioId={
                      expandedPortfolio || portfolios[0]?._id.toString()
                    }
                    onPerformanceUpdate={handlePerformanceUpdate}
                  />
                </div>
                {/* Recent Transactions (1/3 width on medium screens and up) */}
                <div>
                  {expandedPortfolio ? (
                    <RecentTransactions portfolioId={expandedPortfolio} />
                  ) : (
                    <RecentTransactions />
                  )}
                </div>
                <div>
                  {expandedPortfolio ? (
                    <AddTransactionButton
                      portfolioId={expandedPortfolio}
                      isEnabled={true}
                    />
                  ) : (
                    <AddTransactionButton isEnabled={false} />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ProtectedLayout>
  );
}
