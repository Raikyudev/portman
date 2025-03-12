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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";

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

  const renderPaginationItems = () => {
    const items = [];
    const startPage = Math.max(1, currentPage - 1); // One page before current
    const endPage = Math.min(totalPages, currentPage + 1); // One page after current

    // Add "Previous" button
    items.push(
      <PaginationItem key="previous">
        <PaginationPrevious
          onClick={() => handlePageChange(currentPage - 1)}
          className={
            (currentPage === 1 ? "disabled-class hover:bg-true-black" : "") +
            "cursor-pointer"
          }
        />
      </PaginationItem>,
    );

    // Add ellipsis before if there are pages before startPage
    if (startPage > 1) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Add page numbers (current, one before, one after)
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            isActive={page === currentPage}
            onClick={() => handlePageChange(page)}
            className="cursor-pointer" // Explicitly set cursor to pointer
          >
            {page}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Add ellipsis after if there are pages after endPage
    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Add "Next" button
    items.push(
      <PaginationItem key="next">
        <PaginationNext
          onClick={() => handlePageChange(currentPage + 1)}
          className={
            (currentPage === totalPages ? "disabled-class" : "") +
            "cursor-pointer"
          }
        />
      </PaginationItem>,
    );

    return items;
  };

  return (
    <div className="rounded-lg border shadow-sm bg-true-black">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Market Assets</h2>
        {totalPages > 1 && (
          <Pagination className="ml-auto">
            <PaginationContent>{renderPaginationItems()}</PaginationContent>
          </Pagination>
        )}
      </div>
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
                      watchlist={
                        watchlist ? watchlist.map((item) => item.symbol) : []
                      }
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
    </div>
  );
}
