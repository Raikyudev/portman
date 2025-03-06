// src/components/PortfolioDropdown.tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import WhiteCross from "../../public/white-cross.svg";
import { IExtendedPortfolio } from "@/types/portfolio";

interface PortfolioDropdownProps {
  portfolios: IExtendedPortfolio[];
  onPortfolioSelect: (portfolioId: string) => void;
  onClose: () => void;
  initialPortfolioId?: string;
}

export default function PortfolioDropdown({
  portfolios,
  onPortfolioSelect,
  onClose,
  initialPortfolioId,
}: PortfolioDropdownProps) {
  const selectedPortfolioId = initialPortfolioId || portfolios[0]?._id;

  return (
    <Card className="absolute top-full left-0 mt-2 w-64 bg-black border border-red rounded shadow-lg z-10">
      <div className="flex justify-between items-center p-2 border-b border-red">
        <span className="text-white font-semibold">All Portfolios</span>
        <Button onClick={onClose} className="p-1" variant="ghost">
          <Image
            src={WhiteCross}
            alt="Close Icon"
            width={16}
            height={16}
            className="w-4 h-4"
          />
        </Button>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {portfolios.map((portfolio) => (
          <Button
            key={portfolio._id.toString()}
            onClick={() => {
              onPortfolioSelect(portfolio._id.toString());
              onClose();
            }}
            className={`w-full text-left p-2 ${
              selectedPortfolioId === portfolio._id.toString()
                ? "bg-red text-white"
                : "bg-black text-white"
            } hover:bg-red hover:text-white rounded-none border-b border-gray-700 last:border-b-0`}
          >
            <div className="flex justify-between">
              <span>{portfolio.name || "Portfolio Name"}</span>
              <span>${portfolio.port_total_value.toLocaleString()}</span>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
}
