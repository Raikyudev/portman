"use client";

import { useState, useEffect } from "react";
import ProtectedLayout from "@/app/ProtectedLayout";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Watchlist from "@/components/Watchlist";
import RecentTransactions from "@/components/RecentTransactions";

const topHoldings = [
  { name: "Apple Inc.", shares: 50, value: 11800, percentage: 10 },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [portfolioHistory, setPortfolioHistory] = useState<
    { port_total_value: number; port_history_date: string }[]
  >([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [profitLoss, setProfitLoss] = useState({ percentage: 0, amount: 0 });
  const [error, setError] = useState<string | null>(null);
  const [topGainers, setTopGainers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);
  const [topLosers, setTopLosers] = useState<
    { symbol: string; price: number; change: string }[]
  >([]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.id) {
      console.error("User is not authenticated or session user ID is missing", {
        status,
        session,
      });
      return;
    }

    const fetchPortfolioHistory = async () => {
      try {
        const userId = session.user.id;
        console.log("Fetching aggregated history for userId:", userId);
        const response = await fetch(`/api/portfolio-history/aggregate`, {
          credentials: "include",
        });
        console.log("Fetch response:", {
          status: response.status,
          statusText: response.statusText,
        });
        if (!response.ok) {
          const data = await response.json();
          console.error("Fetch failed:", {
            status: response.status,
            error: data.error || "Unknown error",
          });
        }
        const { data } = await response.json();
        console.log("Fetched data:", data);
        setPortfolioHistory(data);
        setError(null);

        if (data.length > 0) {
          const latestValue = data[data.length - 1].port_total_value;
          setPortfolioValue(latestValue);
          const oldestValue = data[0].port_total_value || latestValue;
          const percentageChange =
            ((latestValue - oldestValue) / oldestValue) * 100;
          const amountChange = latestValue - oldestValue;
          setProfitLoss({
            percentage: Math.round(percentageChange),
            amount: Math.round(amountChange),
          });
        }
      } catch (error) {
        console.error("Error in fetchPortfolioHistory:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    const fetchMarketData = async () => {
      try {
        const response = await fetch("/api/market/top", {
          credentials: "include",
        });
        console.log("Market API Response:", {
          status: response.status,
          statusText: response.statusText,
        });
        if (!response.ok) {
          const data = await response.json();
          console.error("Market API failed:", {
            status: response.status,
            error: data.error || "Unknown error",
          });
        }
        const { topGainers, topLosers, gainersPeriod, losersPeriod } =
          await response.json();
        console.log("Market Data:", {
          topGainers,
          topLosers,
          gainersPeriod,
          losersPeriod,
        });
        setTopGainers(topGainers);
        setTopLosers(topLosers);
      } catch (error) {
        console.error("Error in fetchMarketData:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    };

    fetchPortfolioHistory().then(() => {});
    fetchMarketData().then(() => {});
  }, [status, session]);

  const chartData = portfolioHistory.map((entry) => ({
    date: new Date(entry.port_history_date).toLocaleDateString(),
    value: entry.port_total_value,
  }));

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          Hi, {session?.user?.first_name || "User "} (All Portfolios)
        </h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 auto-rows-max">
          <Watchlist />

          <Card>
            <CardHeader>
              <CardTitle>Top Gainers Today</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topGainers.length > 0 ? (
                    topGainers.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.symbol}</TableCell>
                        <TableCell>${item.price.toLocaleString()}</TableCell>
                        <TableCell>{item.change}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3}>No data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Losers Today</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLosers.length > 0 ? (
                    topLosers.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.symbol}</TableCell>
                        <TableCell>${item.price.toLocaleString()}</TableCell>
                        <TableCell>{item.change}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3}>No data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              <div className="text-2xl font-bold">
                ${portfolioValue.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span>Past day/month/year performance</span>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Net Profit/Loss: {profitLoss.percentage}% ($
                {profitLoss.amount.toLocaleString()})
              </div>
              <div className="mt-4 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: "#6b7280" }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: "#6b7280" }}
                    />
                    <Tooltip
                      formatter={(value: number, name, props) => [
                        `$${value.toLocaleString()} (${props.payload.date})`,
                        "Value",
                      ]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#6b7280" }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentTransactions />

          <Card>
            <CardHeader>
              <CardTitle>Top Holdings</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>% of Portfolio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topHoldings.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.shares}</TableCell>
                      <TableCell>${item.value.toLocaleString()}</TableCell>
                      <TableCell>{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
