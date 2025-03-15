// src/components/PortfolioDropdown.tsx
"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IExtendedPortfolio } from "@/types/portfolio";
import AddPortfolioPopover from "./AddPortfolioPopover";

interface PortfolioDropdownProps {
  portfolios: IExtendedPortfolio[];
  onPortfolioSelect: (portfolioId: string) => void;
  initialPortfolioId?: string;
  create?: boolean;
}

export default function PortfolioDropdown({
  portfolios,
  onPortfolioSelect,
  initialPortfolioId,
  create = true,
}: PortfolioDropdownProps) {
  // Local state to manage the selected portfolio
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(
    null,
  );

  // Sync with initialPortfolioId on mount or when it changes
  useEffect(() => {
    if (
      initialPortfolioId &&
      portfolios.some((p) => p._id.toString() === initialPortfolioId)
    ) {
      setSelectedPortfolioId(initialPortfolioId);
    } else if (portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0]._id.toString());
    } else {
      setSelectedPortfolioId(null);
    }
  }, [initialPortfolioId, portfolios]);

  // Handle portfolio selection
  const handleSelect = (portfolioId: string) => {
    setSelectedPortfolioId(portfolioId);
    onPortfolioSelect(portfolioId);
  };

  // Fallback display if no portfolio is selected
  const displayName = selectedPortfolioId
    ? portfolios.find((p) => p._id.toString() === selectedPortfolioId)?.name ||
      "Portfolio Name"
    : "Select Portfolio";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-red text-white p-2 flex justify-between space-x-2 rounded-lg min-w-[150px]">
          <span>{displayName}</span>
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
          {portfolios.length > 0 ? (
            portfolios.map((portfolio) => (
              <DropdownMenuItem
                key={portfolio._id.toString()}
                onClick={() => handleSelect(portfolio._id.toString())}
                className={`${
                  selectedPortfolioId === portfolio._id.toString()
                    ? "bg-true-black text-white border border-red border-2"
                    : "bg-true-black text-white"
                } hover:bg-red hover:text-white p-2 text-left`}
              >
                {create ? (
                  <div className="flex justify-between w-full">
                    <span>{portfolio.name || "Portfolio Name"}</span>
                    <span>
                      ${portfolio.port_total_value?.toLocaleString() || "0"}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-center w-full">
                    <span>{portfolio.name || "Portfolio Name"}</span>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem
              disabled
              className="bg-true-black text-gray-500 p-2 text-center"
            >
              No portfolios available
            </DropdownMenuItem>
          )}
        </div>
        {create && (
          <div className="p-2 flex justify-center">
            <AddPortfolioPopover
              trigger={
                <Button
                  variant="default"
                  className="w-auto bg-red text-white mt-4 px-4 rounded-2xl"
                >
                  Create new portfolio
                </Button>
              }
            />
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
