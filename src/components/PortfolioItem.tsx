import { IPortfolio } from "@/models/Portfolio";
import PortfolioAssetItem from "./PortfolioAssetItem";
import { IExtendedPortfolioAsset } from "@/types/portfolio";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface PortfolioItemProps {
  portfolio: IPortfolio;
  assets: IExtendedPortfolioAsset[];
  expandedPortfolio: string | null;
}

export default function PortfolioItem({
  portfolio,
  assets,
  expandedPortfolio,
}: PortfolioItemProps) {
  const router = useRouter();
  const [historyLoading, setHistoryLoading] = useState(false);
  const hasFetchedRef = useRef(false); // Track if API has been called

  useEffect(() => {
    // Trigger history fetch/update only on initial expansion
    if (
      expandedPortfolio === portfolio._id.toString() &&
      !historyLoading &&
      !hasFetchedRef.current
    ) {
      setHistoryLoading(true);
      hasFetchedRef.current = true; // Mark as fetched
      fetch(
        `/api/portfolio-history/individual?portfolio_id=${portfolio._id.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      )
        .then(async (response) => {
          if (!response.ok) {
            console.error(
              "Failed to fetch individual history:",
              response.statusText,
            );
            const data = await response.json();
            return await Promise.reject(data);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Individual history response:", data);
        })
        .catch((error) => {
          console.error("Error fetching individual history:", error);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [expandedPortfolio, portfolio._id, historyLoading]);

  return (
    <li key={portfolio._id.toString()}>
      <strong>{portfolio.name}</strong>{" "}
      {portfolio.description && ` - ${portfolio.description}`}
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
          {historyLoading && <p>Loading history...</p>}
          {assets.length > 0 ? (
            <ul>
              {assets.map((asset) => (
                <PortfolioAssetItem key={asset._id.toString()} asset={asset} />
              ))}
            </ul>
          ) : (
            <p>No assets found in this portfolio</p>
          )}
        </div>
      )}
    </li>
  );
}
