// Watchlist Button component

import Image from "next/image";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WatchlistButtonProps {
  symbol: string;
  watchlist: string[];
  onToggleWatchlist: () => Promise<void>;
}

export default function WatchlistButton({
  symbol,
  watchlist,
  onToggleWatchlist,
}: WatchlistButtonProps) {
  const isInWatchlist = watchlist.includes(symbol);
  const [isLoading, setIsLoading] = useState(false);

  // Manages asset in the watchlist - Add or Remove
  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent the click event from bubbling up to the TableRow
      setIsLoading(true);
      try {
        await onToggleWatchlist();
      } catch (error) {
        console.error("Error toggling watchlist:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [onToggleWatchlist],
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={isLoading}
            aria-label={
              isInWatchlist ? "Remove from watchlist" : "Add to watchlist"
            }
            className="hover:bg-gray-100 rounded-full"
          >
              {/*Source: https://www.figma.com/design/T39HStFnJfPqS8sAqDDULd/Venus---Design-System-2021--Free-Version---Community-?node-id=431-1349&p=f&t=MO2U7sTllRmIikXD-0*/}
            <Image
              src={`/white-${isInWatchlist ? "filled" : "empty"}-star.svg`}
              alt={isInWatchlist ? "Filled star" : "Empty star"}
              width={24}
              height={24}
              className="transition-opacity duration-200"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          className={"text-white bg-true-black border border-red"}
        >
          <p>{isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
