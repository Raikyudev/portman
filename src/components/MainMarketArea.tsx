// components/MainMarketArea.tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { IExtendedAsset } from "@/types/asset";

interface MainMarketAreaProps {
  assets: IExtendedAsset[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export default function MainMarketArea({
  assets,
  currentPage,
  totalPages,
  loading,
  onPageChange,
}: MainMarketAreaProps) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const handleAssetSelect = (symbol: string) => {
    setSelectedAsset(symbol === selectedAsset ? null : symbol);
    // Placeholder for fetching more details - e.g., open a modal or API call
    if (symbol !== selectedAsset) {
      console.log(`Selected asset: ${symbol}`);
      // Add your logic here (e.g., fetchDetails(symbol))
    }
  };

  const handlePageChangeInternal = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handleAddToWatchlist = (symbol: string) => {
    console.log(`Added ${symbol} to watchlist`);
    // Implement watchlist logic here (e.g., API call or state update)
  };

  return (
    <div className="bg-true-black text-white rounded-lg p-4 h-full">
      <h2 className="text-lg font-semibold mb-2">
        Choose an asset to see more details
      </h2>
      <div className="flex justify-end mb-2">
        <Button
          onClick={() => handlePageChangeInternal(currentPage - 1)}
          disabled={currentPage === 1}
          className="mr-2 bg-gray-700 hover:bg-gray-600 text-white"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="mx-2">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => handlePageChangeInternal(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="bg-gray-700 hover:bg-gray-600 text-white"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-300px)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-800">
              <TableHead className="w-[100px]">Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                  {/* Optional: Add a spinner here */}
                </TableCell>
              </TableRow>
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No assets found.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow
                  key={asset.symbol}
                  className={
                    selectedAsset === asset.symbol ? "bg-gray-700" : ""
                  }
                  onClick={() => handleAssetSelect(asset.symbol)}
                >
                  <TableCell className="font-medium">{asset.symbol}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell className="text-right">
                    ${asset.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.change >= 0 ? "+" : ""}
                    {asset.change.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToWatchlist(asset.symbol);
                      }}
                      className="text-blue-400 hover:underline"
                      aria-label={`Add ${asset.symbol} to watchlist`}
                    >
                      ★
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
