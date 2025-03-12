import React, { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface WatchlistItem {
  _id: string;
  asset_id: string;
  symbol: string;
  price: number;
  change: string;
}

interface WatchlistProps {
  setWatchlist?: (watchlist: WatchlistItem[]) => void; // Make setWatchlist optional with '?'
}

export default function Watchlist({ setWatchlist }: WatchlistProps) {
  const { data: session, status } = useSession();
  const [watchlistLocal, setWatchlistLocal] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (status === "loading") return;

      if (status === "unauthenticated" || !session?.user?.id) {
        setError("User is not authenticated");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/watchlist`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error("Failed to fetch watchlist");
        }

        const data = await response.json();
        // Ensure data is an array
        const watchlistData = Array.isArray(data) ? data : [];
        setWatchlistLocal(watchlistData);
        // Call setWatchlist only if it’s provided
        if (setWatchlist) {
          setWatchlist(watchlistData);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setWatchlistLocal([]);
        if (setWatchlist) {
          setWatchlist([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, [status, session, setWatchlist]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="h-auto flex items-center justify-center">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-true-black">
      <CardHeader>
        <CardTitle>Your Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="h-auto">
        {error && <div className="text-red mb-4">{error}</div>}
        <ScrollArea className="h-[calc(30vh-10px)] w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchlistLocal.length > 0 ? (
              watchlistLocal.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.symbol}</TableCell>
                  <TableCell>${item.price.toLocaleString()}</TableCell>
                  <TableCell>
                    {parseFloat(item.change) >= 0
                      ? "+" + item.change
                      : item.change}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3}>
                  {error ? error : "No items in watchlist"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
