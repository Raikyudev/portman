"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IPortfolio } from "@/models/Portfolio";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PerformanceChart from "@/components/PerformanceChart";
import ProtectedLayout from "@/app/ProtectedLayout";

export default function Page() {
  const [portfolios, setPortfolios] = useState<IPortfolio[]>([]);
  const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const session = useSession();

  const fetchPortfolios = useCallback(async () => {
    try {
      const response = await fetch("/api/portfolio", {
        credentials: "include",
      });
      if (!response.ok) console.error("Error fetching portfolios");

      const data: IPortfolio[] = await response.json();
      setPortfolios(data ?? []);

      if (data.length === 1) {
        setExpandedPortfolio(data[0]._id.toString());
      }
    } catch (error) {
      console.error("Error fetching portfolios:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios().then(() => {});
  }, [fetchPortfolios]);

  if (loading) return <p>Loading...</p>;

  const selectedPortfolio = portfolios.find(
    (p) => p._id.toString() === expandedPortfolio,
  );

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4 text-white bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">
          Hi {session?.data?.user?.first_name || "User"}, Your portfolios
        </h1>
        <div className="flex items-center mb-4 space-x-4">
          <Card className="bg-gray-800 p-2">
            <span>User&apos;s Portfolio</span>
          </Card>
          <Card className="bg-red-600 text-white p-2 rounded">
            <span>{selectedPortfolio?.name || "Portfolio Name"}</span>
          </Card>
          <Card className="bg-gray-800 p-2">
            <span>Earnings +3% ($3,900)</span>
          </Card>
          <Card className="bg-gray-800 p-2">
            <span>Portfolio Value $(13000))</span>{" "}
            {/* Replace with dynamic value if available */}
          </Card>
        </div>
        {portfolios.length > 0 && (
          <Tabs
            value={expandedPortfolio || portfolios[0]?._id.toString()}
            onValueChange={setExpandedPortfolio}
          >
            <TabsList className="mb-4">
              {portfolios.map((portfolio) => (
                <TabsTrigger
                  key={portfolio._id.toString()}
                  value={portfolio._id.toString()}
                >
                  {portfolio.name || "Portfolio Name"}
                </TabsTrigger>
              ))}
            </TabsList>
            {portfolios.map((portfolio) => (
              <TabsContent
                key={portfolio._id.toString()}
                value={portfolio._id.toString()}
              >
                <div className="grid grid-cols-1">
                  <PerformanceChart portfolioId={portfolio._id.toString()} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </ProtectedLayout>
  );
}
