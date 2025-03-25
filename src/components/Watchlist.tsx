import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
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
import { useCurrency } from "@/contexts/CurrencyContext";
import { batchConvertAndFormatCurrency } from "@/lib/currencyUtils";

interface WatchlistItem {
  _id: string;
  asset_id: string;
  symbol: string;
  price: number;
  change: string;
}

interface WatchlistProps {
  setWatchlist?: (watchlist: WatchlistItem[]) => void;
}

interface WatchlistRef {
  refetch: () => Promise<void>;
}

const Watchlist = forwardRef<WatchlistRef, WatchlistProps>(
  ({ setWatchlist }, ref) => {
    const { data: session, status } = useSession();
    const { preferredCurrency, isLoading, rates } = useCurrency();

    const [watchlistLocal, setWatchlistLocal] = useState<WatchlistItem[]>([]);
    const [formattedPrices, setFormattedPrices] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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

        const watchlistData = Array.isArray(data) ? data : [];
        setWatchlistLocal(watchlistData);

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

    useImperativeHandle(ref, () => ({
      refetch: fetchWatchlist,
    }));

    useEffect(() => {
      fetchWatchlist();
    }, []);

    useEffect(() => {
      const updateCurrencyValues = async () => {
        if (isLoading || watchlistLocal.length === 0) return;

        const prices = watchlistLocal.map((item) => item.price);

        const formatted = await batchConvertAndFormatCurrency(
          prices,
          "USD",
          preferredCurrency,
          "en-US",
          rates,
        );

        setFormattedPrices(formatted);
      };

      updateCurrencyValues();
    }, [watchlistLocal, preferredCurrency, rates, isLoading]);

    if (loading) {
      return (
        <Card className={"bg-true-black"}>
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
      <Card className="bg-true-black h-[40vh]">
        <CardHeader>
          <CardTitle>Your Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="h-auto">
          {error && <div className="text-red mb-4">{error}</div>}
          <ScrollArea className="h-[30vh] w-full">
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
                      <TableCell>
                        {formattedPrices[index] || "Loading..."}
                      </TableCell>
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
  },
);

Watchlist.displayName = "Watchlist";

export default Watchlist;
