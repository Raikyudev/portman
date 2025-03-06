"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Transaction {
  date: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
}

interface AllTransactionsProps {
  portfolioId?: string; // Optional portfolioId prop
}

export default function AllTransactions({
  portfolioId,
}: AllTransactionsProps = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTransactions = async () => {
      setLoading(true);
      try {
        // Construct the API URL based on whether portfolioId is provided
        const url = portfolioId
          ? `/api/transactions?portfolio_id=${portfolioId}`
          : "/api/transactions";

        const response = await fetch(url, {
          credentials: "include",
        });
        console.log("All Transactions API Response:", {
          status: response.status,
          statusText: response.statusText,
          url,
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("All Transactions API failed:", {
            status: response.status,
            error: data.error || "Unknown error",
          });
          setError("Failed to load all transactions");
          return;
        }

        const { data } = await response.json();
        console.log("Fetched all transactions:", data);
        setTransactions(data || []);
        setError(null);
      } catch (error) {
        console.error("Error in fetchAllTransactions:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllTransactions();
  }, [portfolioId]); // Add portfolioId as a dependency to refetch when it changes

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 text-white">All Transactions</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <ScrollArea className="h-[calc(80vh-12rem)] max-h-full w-full p-2">
        {loading ? (
          <p className="text-gray-300">Loading all transactions...</p>
        ) : (
          <Table className="w-full table-auto no-border">
            <TableHeader className="sticky">
              <TableRow className="bg-black top-0 z-10">
                <TableHead className="w-1/6 text-left">Date</TableHead>
                <TableHead className="w-1/6 text-left">Symbol</TableHead>
                <TableHead className="w-1/6 text-left">Type</TableHead>
                <TableHead className="w-1/6 text-right">Quantity</TableHead>
                <TableHead className="w-1/6 text-right">Price</TableHead>
                <TableHead className="w-1/6 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-left">{item.date}</TableCell>
                    <TableCell className="text-left">{item.symbol}</TableCell>
                    <TableCell className="text-left">{item.type}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No transactions available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
