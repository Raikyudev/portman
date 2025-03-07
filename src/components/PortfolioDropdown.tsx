// src/components/PortfolioDropdown.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IExtendedPortfolio } from "@/types/portfolio";
import { useRouter } from "next/navigation";

interface PortfolioDropdownProps {
  portfolios: IExtendedPortfolio[];
  onPortfolioSelect: (portfolioId: string) => void;
  initialPortfolioId?: string;
}

export default function PortfolioDropdown({
  portfolios,
  onPortfolioSelect,
  initialPortfolioId,
}: PortfolioDropdownProps) {
  const selectedPortfolioId = initialPortfolioId || portfolios[0]?._id;
  const router = useRouter();

  const handleCreateNewPortfolio = () => {
    router.push("/portfolio/add");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-red text-white p-2 flex items-center space-x-2 rounded-xl">
          <span>
            {portfolios.find((p) => p._id.toString() === selectedPortfolioId)
              ?.name || "Portfolio Name"}
          </span>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-true-black border border-red rounded-xl shadow-lg mt-2 border-2">
        <div className="p-2 border-b no-border">
          <span className="text-white font-semibold">All Portfolios</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {portfolios.map((portfolio) => (
            <DropdownMenuItem
              key={portfolio._id.toString()}
              onClick={() => {
                onPortfolioSelect(portfolio._id.toString());
              }}
              className={`${
                selectedPortfolioId === portfolio._id.toString()
                  ? "bg-true-black text-white border border-red border-2"
                  : "bg-true-black text-white"
              } hover:bg-red hover:text-white p-2 text-left`}
            >
              <div className="flex justify-between w-full">
                <span>{portfolio.name || "Portfolio Name"}</span>
                <span>${portfolio.port_total_value.toLocaleString()}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        <div className="p-2 flex justify-center">
          <Button
            onClick={handleCreateNewPortfolio}
            variant="default"
            className="w-auto bg-red text-white mt-4 px-4 rounded-2xl"
          >
            Create new portfolio
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
