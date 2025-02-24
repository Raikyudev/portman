interface PortfolioSelectProps {
  portfolios: { _id: string; name: string }[];
  selectedPortfolio: string;
  setSelectedPortfolio: (value: string) => void;
}

export default function PortfolioSelect({
  portfolios,
  selectedPortfolio,
  setSelectedPortfolio,
}: PortfolioSelectProps) {
  return (
    <label className="flex flex-col">
      Select Portfolio:
      <select
        value={selectedPortfolio}
        onChange={(e) => setSelectedPortfolio(e.target.value)}
      >
        {portfolios.map((portfolio) => (
          <option key={portfolio._id} value={portfolio._id}>
            {portfolio.name}
          </option>
        ))}
      </select>
    </label>
  );
}
