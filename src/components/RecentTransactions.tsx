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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PopoutWindow from "./PopoutWindow"; // Adjust path as needed
import AllTransactions from "./AllTransactions"; // Adjust path as needed

interface Transaction {
  date: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
}

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPopoutOpen, setIsPopoutOpen] = useState(false); // State to control PopoutWindow

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/transactions?limit=5", {
          credentials: "include",
        });
        console.log("Transactions API Response:", {
          status: response.status,
          statusText: response.statusText,
        });
        if (!response.ok) {
          const data = await response.json();
          console.error("Transactions API failed:", {
            status: response.status,
            error: data.error || "Unknown error",
          });
          setError("Failed to load transactions");
        }
        const { data } = await response.json();
        console.log("Fetched transactions:", data);
        setTransactions(data || []);
        setError(null);
      } catch (error) {
        console.error("Error in fetchRecentTransactions:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTransactions();
  }, []);

  // Handle PopoutWindow open
  const openPopout = () => {
    setIsPopoutOpen(true);
  };

  // Handle PopoutWindow close
  const closePopout = () => {
    setIsPopoutOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-6 space-y-0">
        <CardTitle>Recent Transactions</CardTitle>
        <Button onClick={openPopout} variant="outline" size="sm">
          View All Transactions
        </Button>
      </CardHeader>
      <CardContent className="h-auto">
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {loading ? (
          <p>Loading transactions...</p>
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
                  <TableCell colSpan={6}>No recent transactions</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        <PopoutWindow isOpen={isPopoutOpen} onClose={closePopout}>
          <AllTransactions />
        </PopoutWindow>
      </CardContent>
    </Card>
  );
}
