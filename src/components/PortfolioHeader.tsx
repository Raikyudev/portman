// Portfolio Header component

import { Card } from "@/components/ui/card";
import PortfolioDropdown from "./PortfolioDropdown";
import { IExtendedPortfolio } from "@/types/portfolio";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { batchConvertAndFormatCurrency } from "@/lib/currencyUtils";
import { useState, useEffect } from "react";

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
  const { preferredCurrency, isLoading, rates } = useCurrency();
  const [formattedPortfolioValue, setFormattedPortfolioValue] = useState("");
  const [formattedProfitAmount, setFormattedProfitAmount] = useState("");

  // Format portfolio value and profit based on preferred currency
  useEffect(() => {
    async function updateCurrencyValues() {
      if (isLoading) return;

      const [formattedValue, formattedProfit] =
        await batchConvertAndFormatCurrency(
          [portfolioValue, profit.amount],
          "USD",
          preferredCurrency,
          "en-US",
          rates,
        );

      setFormattedPortfolioValue(formattedValue);
      setFormattedProfitAmount(formattedProfit);
    }
    updateCurrencyValues();
  }, [portfolioValue, profit.amount, preferredCurrency, isLoading, rates]);

  const earnings = `Earnings ${profit.percentage >= 0 ? `+${formattedProfitAmount}` : `-${formattedProfitAmount}`} (${profit.percentage > 0 ? `+${profit.percentage}%` : `${profit.percentage}%`})`;

  if (isLoading) {
    return <div>Loading currency data...</div>;
  }

  return (
    <div className="flex items-stretch space-x-2 rounded-xl">
      <div className="flex items-center bg-true-black px-10 rounded-xl w-full">
        <Card className="flex-grow rounded no-border text-2xl font-bold bg-true-black">
          <span>{session?.data?.user?.first_name || "User"}'s Portfolio</span>
        </Card>
        <PortfolioDropdown
          portfolios={portfolios}
          onPortfolioSelect={onPortfolioSelect}
          initialPortfolioId={initialPortfolioId}
        />
      </div>

      <div className="flex items-center space-x-2 flex-grow">
        <Card className="flex-grow min-h-full bg-true-black p-1 px-4 rounded-xl no-border">
          <span
            className={`${profit.percentage > 0 ? "text-green-500" : "text-red"}`}
          >
            {earnings}
          </span>
        </Card>
        <Card className="flex-grow min-h-full bg-true-black p-1 px-4 rounded-xl no-border">
          <span>Portfolio Value {formattedPortfolioValue}</span>
        </Card>
      </div>
    </div>
  );
}
