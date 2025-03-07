// src/components/PortfolioHeader.tsx
import { Card } from "@/components/ui/card";
import PortfolioDropdown from "./PortfolioDropdown";
import { IExtendedPortfolio } from "@/types/portfolio";
import { useSession } from "next-auth/react";

interface PortfolioHeaderProps {
  selectedPortfolioName: string;
  earnings: string;
  portfolioValue: string;
  portfolios: IExtendedPortfolio[];
  onPortfolioSelect: (portfolioId: string) => void;
  initialPortfolioId?: string;
}

export default function PortfolioHeader({
  earnings,
  portfolioValue,
  portfolios,
  onPortfolioSelect,
  initialPortfolioId,
}: PortfolioHeaderProps) {
  const session = useSession();

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <Card className="bg-gray-800 p-2 rounded">
          <span>
            {session?.data?.user?.first_name || "User"}&apos;s Portfolio
          </span>
        </Card>
        {/* Remove the relative div and let PortfolioDropdown handle positioning */}
        <div className="w-max">
          <PortfolioDropdown
            portfolios={portfolios}
            onPortfolioSelect={onPortfolioSelect}
            initialPortfolioId={initialPortfolioId}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Card className="bg-gray-800 p-2 rounded">
          <span>{earnings}</span>
        </Card>
        <Card className="bg-gray-800 p-2 rounded">
          <span>{portfolioValue}</span>
        </Card>
      </div>
    </div>
  );
}
