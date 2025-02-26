import { IPortfolio } from "@/models/Portfolio";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";

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
  const router = useRouter();
  if (portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-gray-600">You don’t have any portfolios yet.</p>
        <Button
          onClick={() => router.push("/portfolio/add")}
          className="bg-red text-white"
        >
          Add Portfolio
        </Button>
      </div>
    );
  }

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
