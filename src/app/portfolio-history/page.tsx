"use client";

import PortfolioHistory from "@/components/PortfolioHistory";

export default function PortfolioHistoryPage() {
  const portfolioId = "67b09d3e4f9b6e7c90561cae"; //

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Portfolio History</h1>
      <PortfolioHistory portfolioId={portfolioId} />
    </div>
  );
}
