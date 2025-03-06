// src/components/PortfolioHeader.tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  selectedPortfolioName,
  earnings,
  portfolioValue,
  portfolios,
  onPortfolioSelect,
  initialPortfolioId,
}: PortfolioHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const session = useSession();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <Card className="bg-gray-800 p-2 rounded">
          <span>
            {session?.data?.user?.first_name || "User"}&apos;s Portfolio
          </span>
        </Card>
        <div className="relative">
          <Button
            onClick={toggleDropdown}
            className="bg-red text-white p-2 rounded flex items-center space-x-2"
          >
            <span>{selectedPortfolioName || "Portfolio Name"}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
          {isDropdownOpen && (
            <PortfolioDropdown
              portfolios={portfolios}
              onPortfolioSelect={onPortfolioSelect}
              onClose={() => setIsDropdownOpen(false)}
              initialPortfolioId={initialPortfolioId}
            />
          )}
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
