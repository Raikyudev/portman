"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IPortfolio } from "@/models/Portfolio";
import PortfolioList from "@/components/PortfolioList";
import PortfolioItem from "@/components/PortfolioItem";
import { IExtendedPortfolioAsset } from "@/types/portfolio";
import ProtectedLayout from "@/app/ProtectedLayout";

export default function Page() {
  const [portfolios, setPortfolios] = useState<IPortfolio[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<{
    [key: string]: IExtendedPortfolioAsset[];
  }>({});
  const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const session = useSession();
  console.log(session);

  const fetchPortfolioAssets = useCallback(
    async (portfolioId: string) => {
      if (portfolioAssets[portfolioId]) return;

      try {
        const response = await fetch(`/api/portfolio/assets?id=${portfolioId}`);
        if (!response.ok) console.error("Failed to fetch portfolio assets");

        const assets: IExtendedPortfolioAsset[] = await response.json();
        setPortfolioAssets((prevState) => ({
          ...prevState,
          [portfolioId]: assets,
        }));
      } catch (error) {
        console.error("Error fetching portfolio assets:", error);
      }
    },
    [portfolioAssets],
  );

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await fetch("/api/portfolio");
        if (!response.ok) console.error("Error fetching portfolios");

        const data: IPortfolio[] = await response.json();
        setPortfolios(data ?? []);

        if (data.length === 1) {
          setExpandedPortfolio(data[0]._id.toString());
          await fetchPortfolioAssets(data[0]._id.toString());
        }
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolios().then(() => {});
  }, [fetchPortfolioAssets]);

  if (loading) return <p>Loading...</p>;

  return (
    <ProtectedLayout>
      <div>
        <h1>Hi {session?.data?.user.first_name || "User"}, Your portfolios</h1>
        <PortfolioList
          portfolios={portfolios}
          expandedPortfolio={expandedPortfolio}
          setExpandedPortfolio={setExpandedPortfolio}
          fetchPortfolioAssets={fetchPortfolioAssets}
        />
        <ul>
          {portfolios.map((portfolio) => (
            <PortfolioItem
              key={portfolio._id.toString()}
              portfolio={portfolio}
              assets={portfolioAssets[portfolio._id.toString()] || []}
              expandedPortfolio={expandedPortfolio}
            />
          ))}
        </ul>
      </div>
    </ProtectedLayout>
  );
}
