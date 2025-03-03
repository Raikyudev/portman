import { useState, useEffect } from "react";

interface WatchlistButtonProps {
  assetId: string;
}

export default function WatchlistButton({ assetId }: WatchlistButtonProps) {
  const [inWatchlist, setInWatchlist] = useState<boolean>(false);

  useEffect(() => {
    const fetchWatchlistStatus = async () => {
      try {
        const response = await fetch("/api/watchlist");
        const data = await response.json();
        console.log("WatchButton data:", data);
        // Check if assetId matches any asset_id in the response array
        const isInList =
          Array.isArray(data) && data.some((item) => item.asset_id === assetId);
        setInWatchlist(isInList);
      } catch (error) {
        console.error("Error fetching watchlist status:", error);
        setInWatchlist(false); // Default to false on error
      }
    };

    fetchWatchlistStatus().then(() => {});
  }, [assetId]);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await fetch(`/api/watchlist?id=${assetId}`, { method: "DELETE" });
        setInWatchlist(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asset_id: assetId }),
        });
        setInWatchlist(true);
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
    }
  };

  return (
    <button onClick={toggleWatchlist}>
      {inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
    </button>
  );
}
