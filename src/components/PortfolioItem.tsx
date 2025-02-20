import { IPortfolio } from "@/models/Portfolio";
import PortfolioAssetItem from "./PortfolioAssetItem";
import { IExtendedPortfolioAsset } from "@/types/portfolio";
import { useRouter } from "next/navigation";

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
