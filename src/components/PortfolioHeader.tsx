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
  portfolioValue: number; // Add portfolioValue as a prop
  profit: { percentage: number; amount: number }; // Add profit as a prop
}

export default function PortfolioHeader({
  portfolios,
  onPortfolioSelect,
  initialPortfolioId,
  portfolioValue, // Destructure the new prop
  profit, // Destructure the new prop
}: PortfolioHeaderProps) {
  const session = useSession();

  // Format earnings based on profit
  const earnings = `Earnings ${profit.percentage >= 0 ? `+$${profit.amount.toLocaleString()}` : `-$${Math.abs(profit.amount).toLocaleString()}`} (${profit.percentage > 0 ? `+${profit.percentage}%` : `${profit.percentage}%`})`;

  return (
    <div className="flex items-center justify-between mb-4 bg-true-black rounded-xl">
      <div className="flex justify-between space-x-2 bg-true-black p-2 px-10 rounded-xl no-border">
        <Card className="bg-gray-800 p-2 rounded no-border w-auto">
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
      <div className={`flex items-center no-border space-x-2`}>
        <Card className={`bg-true-black p-2 px-4 rounded-xl no-border`}>
          <span
            className={`${profit.percentage > 0 ? "text-green-500" : "text-red"}`}
          >
            {earnings}
          </span>
        </Card>
        <Card className={`bg-true-black p-2 px-4 rounded-xl no-border`}>
          <span>Portfolio Value ${portfolioValue.toLocaleString()}</span>
        </Card>
      </div>
    </div>
  );
}
