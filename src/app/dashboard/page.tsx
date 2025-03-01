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

// Placeholder data for other sections
const watchlist = [
  { symbol: "AAPL", price: 236, change: "+2%" },
  { symbol: "TSLA", price: 430, change: "-5%" },
];
const topGainers = [{ symbol: "AAPL", price: 236, change: "+2%" }];
const topLosers = [{ symbol: "NVDA", price: 870, change: "-10%" }];
const recentTransactions = [
  {
    date: "2025-02-01",
    symbol: "AAPL",
    type: "Buy",
    quantity: 20,
    price: 220,
    total: 4400,
  },
];
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
          credentials: "include", // Ensure cookies are sent for authentication
        });
        console.log("Fetch response:", {
          status: response.status,
          statusText: response.statusText,
        });
        if (!response.ok) {
          const errorText = await response.text(); // Get response body
          console.error("Fetch failed:", {
            status: response.status,
            errorText,
          });
        }
        const { data } = await response.json();
        console.log("Fetched data:", data);
        setPortfolioHistory(data);
        setError(null);

        if (data.length > 0) {
          const latestValue = data[data.length - 1].port_total_value; // Last entry (chronological)
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

    fetchPortfolioHistory();
  }, [status, session]);

  const chartData = portfolioHistory.map((entry) => ({
    date: new Date(entry.port_history_date).toLocaleDateString(),
    value: entry.port_total_value,
  }));

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Hi, User! (All Portfolios)</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Watchlist</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlist.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.symbol}</TableCell>
                      <TableCell>${item.price}</TableCell>
                      <TableCell>{item.change}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Gainers Today</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topGainers.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.symbol}</TableCell>
                      <TableCell>${item.price}</TableCell>
                      <TableCell>{item.change}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Losers Today</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLosers.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.symbol}</TableCell>
                      <TableCell>${item.price}</TableCell>
                      <TableCell>{item.change}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
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
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.symbol}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.price}</TableCell>
                      <TableCell>${item.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Holdings</CardTitle>
            </CardHeader>
            <CardContent>
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
