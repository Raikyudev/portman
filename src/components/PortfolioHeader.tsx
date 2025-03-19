// src/components/PortfolioHeader.tsx
import { Card } from "@/components/ui/card";
import PortfolioDropdown from "./PortfolioDropdown";
import { IExtendedPortfolio } from "@/types/portfolio";
import { useSession } from "next-auth/react";

interface PortfolioHeaderProps {
  selectedPortfolioName: string;
  portfolios: IExtendedPortfolio[];
  onPortfolioSelect: (portfolioId: string) => void;
  initialPortfolioId?: string;
  selectedPortfolioId?: string;
  portfolioValue: number;
  profit: { percentage: number; amount: number };
}

export default function PortfolioHeader({
  portfolios,
  onPortfolioSelect,
  initialPortfolioId,
  portfolioValue,
  profit,
}: PortfolioHeaderProps) {
  const session = useSession();

  const earnings = `Earnings ${profit.percentage >= 0 ? `+$${profit.amount.toLocaleString()}` : `-$${Math.abs(profit.amount).toLocaleString()}`} (${profit.percentage > 0 ? `+${profit.percentage}%` : `${profit.percentage}%`})`;

  return (
      <div className="flex items-stretch mb-4 space-x-2 rounded-xl">
          {/* First section - Portfolio with dropdown */}
          <div className="flex items-center bg-true-black px-10 rounded-xl w-full">
              <Card className="flex-grow rounded no-border text-2xl font-bold bg-true-black">
      <span>
        {session?.data?.user?.first_name || "User"}&apos;s Portfolio
      </span>
              </Card>
              <PortfolioDropdown
                  portfolios={portfolios}
                  onPortfolioSelect={onPortfolioSelect}
                  initialPortfolioId={initialPortfolioId}
              />
          </div>

          {/* Second section - Portfolio Stats */}
          <div className="flex items-center space-x-2 flex-grow">
              <Card className="flex-grow min-h-full bg-true-black p-1 px-4 rounded-xl no-border">
      <span className={`${profit.percentage > 0 ? "text-green-500" : "text-red"}`}>
        {earnings}
      </span>
              </Card>
              <Card className="flex-grow min-h-full bg-true-black p-1 px-4 rounded-xl no-border">
                  <span>Portfolio Value ${portfolioValue.toLocaleString()}</span>
              </Card>
          </div>
      </div>


  );
}
