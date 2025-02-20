import { IPortfolio } from "@/models/Portfolio";

interface PortfolioListProps {
  portfolios: IPortfolio[];
  expandedPortfolio: string | null;
  setExpandedPortfolio: (id: string) => void;
  fetchPortfolioAssets: (id: string) => Promise<void>;
}

export default function PortfolioList({
  portfolios,
  expandedPortfolio,
  setExpandedPortfolio,
  fetchPortfolioAssets,
}: PortfolioListProps) {
  if (portfolios.length === 0)
    return <p>You don&apos;t have any portfolios yet.</p>;

  return (
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
            {!expandedPortfolio && <option>Select a portfolio</option>}
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
    </>
  );
}
