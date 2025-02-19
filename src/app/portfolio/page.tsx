"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IPortfolio } from "@/models/Portfolio";
import { useSession } from "next-auth/react";
import { IPortfolioAsset } from "@/models/PortfolioAsset";

interface IExtendedPortfolioAsset extends IPortfolioAsset {
  asset_info: { symbol: string; name: string };
}

export default function Page() {
  const [portfolios, setPortfolios] = useState<IPortfolio[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<{
    [key: string]: IExtendedPortfolioAsset[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const [unauthorized, setUnauthorized] = useState(false);
  const { data: session } = useSession();
  const [watchlist, setWatchlist] = useState<{ [key: string]: boolean }>({});

  const fetchWatchlistStatus = async (assetId: string) => {
    try {
      const response = await fetch(`/api/watchlist?id=${assetId}`);
      const data = await response.json();
      setWatchlist((prevState) => ({
        ...prevState,
        [assetId]: data.inWatchlist,
      }));
    } catch (error) {
      console.error("Error fetching watchlist status:", error);
    }
  };

  const toggleWatchlist = async (assetId: string) => {
    const inWatchlist = watchlist[assetId];

    try {
      if (inWatchlist) {
        const response = await fetch(`/api/watchlist?id=${assetId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setWatchlist((prevState) => ({
            ...prevState,
            [assetId]: false,
          }));
        }
      } else {
        // Add to watchlist
        const response = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asset_id: assetId }),
        });
        if (response.ok) {
          setWatchlist((prevState) => ({
            ...prevState,
            [assetId]: true,
          }));
        }
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
    }
  };

  const fetchPortfolioAssets = useCallback(
    async (portfolioId: string) => {
      if (portfolioAssets[portfolioId]) {
        return;
      }

      try {
        const response = await fetch(`/api/portfolio/assets?id=${portfolioId}`);

        if (!response.ok) {
          console.error("Failed to fetch portfolio assets");
        }

        const assets: IExtendedPortfolioAsset[] = await response.json();
        setPortfolioAssets((prevState) => ({
          ...prevState,
          [portfolioId]: assets,
        }));
        assets.forEach((asset) => fetchWatchlistStatus(asset._id.toString()));
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

        if (response.status === 401) {
          setUnauthorized(true);
          setTimeout(() => {
            router.push("/auth/login");
          }, 3000);
          return;
        }

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

    fetchPortfolios()
      .then(() => {})
      .catch((error) => console.error("Error fetching portfolios:" + error));
  }, [router, fetchPortfolioAssets]);

  if (unauthorized) {
    return (
      <div>
        <h1>Unauthorized access.</h1>
        <p>Redirecting to login page</p>
      </div>
    );
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>
        Hi {(session?.user as { first_name?: string })?.first_name || "User"}{" "}
        Your portfolios
      </h1>
      {portfolios.length > 0 ? (
        <>
          {portfolios.length > 1 && (
            <div>
              <label>Select Portfolio: </label>
              <select
                value={expandedPortfolio || ""}
                onChange={async (e) => {
                  const selectedPortfolio = e.target.value;
                  setExpandedPortfolio(selectedPortfolio);
                  await fetchPortfolioAssets(selectedPortfolio);
                }}
              >
                {!expandedPortfolio && <option> Select a portfolio </option>}
                {portfolios.map((portfolio) => (
                  <option
                    key={portfolio._id.toString()}
                    value={portfolio._id.toString()}
                  >
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ul>
            {portfolios.map((portfolio: IPortfolio) => (
              <li key={portfolio._id.toString()}>
                <strong>{portfolio.name}</strong>
                {portfolio.description ? " - " + portfolio.description : ""}
                <div>
                  <button
                    onClick={() =>
                      router.push(
                        `/portfolio/${portfolio._id.toString()}/add-transaction`,
                      )
                    }
                  >
                    Add Transaction
                  </button>
                </div>
                {expandedPortfolio === portfolio._id.toString() && (
                  <div>
                    <h3>Assets</h3>
                    {portfolioAssets[portfolio._id.toString()] ? (
                      portfolioAssets[portfolio._id.toString()].length > 0 ? (
                        <ul>
                          {portfolioAssets[portfolio._id.toString()].map(
                            (asset) => (
                              <li key={asset._id.toString()}>
                                <strong>{asset.asset_info.symbol}</strong> -{" "}
                                {asset.asset_info.name}
                                <br />
                                <span>Quantity: {asset.quantity}</span> |
                                <span>
                                  Avg Buy Price: {asset.avg_buy_price} (
                                  {asset.currency})
                                </span>
                                <button
                                  onClick={() =>
                                    toggleWatchlist(asset._id.toString())
                                  }
                                >
                                  {watchlist[asset._id.toString()]
                                    ? "Remove from Watchlist"
                                    : "Add to Watchlist"}
                                </button>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p>No assets found in this portfolio</p>
                      )
                    ) : (
                      <p>Loading assets...</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>You don&#39;t have any portfolios yet.</p>
      )}
      <button onClick={() => router.push("/portfolio/add")}>
        Add portfolio
      </button>
    </div>
  );
}
