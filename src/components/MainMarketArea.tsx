"use client";

import WatchlistButton from "./WatchlistButton";
import { IExtendedAsset } from "@/types/asset";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface MainMarketAreaProps {
  assets: IExtendedAsset[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  watchlist: {
    _id: string;
    asset_id: string;
    symbol: string;
    price: number;
    change: string;
  }[];
  onToggleWatchlist: (assetId: string, add: boolean) => Promise<void>;
}

export default function MainMarketArea({
  assets,
  currentPage,
  totalPages,
  loading,
  onPageChange,
  watchlist,
  onToggleWatchlist,
}: MainMarketAreaProps) {
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  return (
    <div className="rounded-lg border shadow-sm bg-true-black">
      <h2 className="text-xl font-semibold p-4">Market Assets</h2>
      {loading && <div className="text-center py-4">Loading assets...</div>}
      {!loading && assets.length === 0 && (
        <div className="text-center py-4">No assets found.</div>
      )}
      {!loading && assets.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Watchlist</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset._id.toString()}>
                  <TableCell>{asset.symbol}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>${asset.price.toFixed(2)}</TableCell>
                  <TableCell>{asset.change}</TableCell>
                  <TableCell>
                    <WatchlistButton
                      symbol={asset.symbol}
                      watchlist={watchlist.map((item) => item.symbol)} // Map to symbols for comparison
                      onToggleWatchlist={() =>
                        onToggleWatchlist(
                          asset._id.toString(),
                          !watchlist.some(
                            (item) => item.asset_id === asset._id.toString(),
                          ),
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
