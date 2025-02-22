import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";

interface PortfolioHistoryEntry {
  port_history_date: string;
  portfolio_total_value: number;
}

export default function PortfolioHistoryChart({
  portfolioId,
}: {
  portfolioId: string;
}) {
  const [history, setHistory] = useState<PortfolioHistoryEntry[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      const res = await fetch(
        `/api/portfolio-history/get?portfolio_id=${portfolioId}`,
      );
      const data = await res.json();
      setHistory(data.data);
    }
    fetchHistory().then(() => {});
  }, [portfolioId]);

  return (
    <div>
      <h2>Portfolio History</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history}>
          <XAxis
            dataKey="port_history_date"
            tickFormatter={(date) => new Date(date).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="portfolio_total_value"
            stroke="#8884d8"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
