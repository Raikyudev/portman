
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
import WhiteFilledStar from "../../public/white-filled-star.svg";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import AssetDetails from "@/components/AssetDetails";

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
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const handleRowClick = (assetId: string) => {
    setSelectedAssetId(assetId);
  };

  const handleCloseDetails = () => {
    setSelectedAssetId(null);
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
            className="cursor-pointer"
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
    <Card className="h-[82vh] bg-true-black flex flex-col">
      {selectedAssetId ? (
        <AssetDetails
          assetId={selectedAssetId}
          onClose={handleCloseDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
        />
      ) : (
        <div className="rounded-lg no-border shadow-sm bg-true-black flex flex-col h-full">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:justify-between items-center p-4 gap-4">
            {/* Instruction and Watchlist Info */}
            <div className="flex flex-col sm:flex-row justify-center lg:justify-end gap-4 p-4 w-full lg:w-auto">
              <div className="bg-black p-4 text-gray text-sm rounded-lg font-semibold">
                Choose an asset to see more details
              </div>
              <div className="flex gap-4 text-gray bg-black p-3 text-sm rounded-lg font-semibold">
                <Image
                  src={WhiteFilledStar}
                  alt="White star icon"
                  width={18}
                  height={18}
                  className="w-5 h-5"
                />{" "}
                to add to the watchlist
              </div>
            </div>

            {/* Pagination */}
            <div className="w-full lg:w-auto">
              {totalPages > 1 && (
                <Pagination className="flex justify-center lg:justify-end">
                  <PaginationContent>
                    {renderPaginationItems()}
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>

          {/* ScrollArea Section */}
          {loading && <div className="text-center py-4">Loading assets...</div>}
          {!loading && assets.length === 0 && (
            <div className="text-center py-4">No assets found.</div>
          )}
          {!loading && assets.length > 0 && (
            <ScrollArea className="w-full flex-1">
              <div className="overflow-x-auto p-4">
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
                      <TableRow
                        key={asset._id.toString()}
                        onClick={() => handleRowClick(asset._id.toString())}
                        className="cursor-pointer"
                      >
                        <TableCell>{asset.symbol}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>${asset.price.toFixed(2)}</TableCell>
                        <TableCell>{asset.change.toFixed(2)}%</TableCell>
                        <TableCell>
                          <WatchlistButton
                            symbol={asset.symbol}
                            watchlist={
                              watchlist
                                ? watchlist.map((item) => item.symbol)
                                : []
                            }
                            onToggleWatchlist={() =>
                              onToggleWatchlist(
                                asset._id.toString(),
                                !watchlist.some(
                                  (item) =>
                                    item.asset_id === asset._id.toString(),
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
            </ScrollArea>
          )}
        </div>
      )}
    </Card>
  );
}
