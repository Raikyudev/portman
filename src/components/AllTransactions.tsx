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

interface Transaction {
  date: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
}

export default function AllTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTransactions = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/transactions", {
          // Assuming no limit for all transactions
          credentials: "include",
        });
        console.log("All Transactions API Response:", {
          status: response.status,
          statusText: response.statusText,
        });
        if (!response.ok) {
          const data = await response.json();
          console.error("All Transactions API failed:", {
            status: response.status,
            error: data.error || "Unknown error",
          });
          setError("Failed to load all transactions");
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
  }, []);

  return (
    <>
      <h2 className="text-2xl font-bold mb-4 text-white">All Transactions</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <p className="text-gray-300">Loading all transactions...</p>
      ) : (
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
            {transactions.length > 0 ? (
              transactions.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.symbol}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.price.toLocaleString()}</TableCell>
                  <TableCell>${item.total.toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>No transactions available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );
}
