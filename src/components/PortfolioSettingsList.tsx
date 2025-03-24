"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Portfolio {
  _id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function PortfolioSettingsList() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPortfolios() {
      try {
        const response = await fetch("/api/user-portfolios");
        const data = await response.json();

        if (response.ok) {
          setPortfolios(data.portfolios);
        } else {
          console.error(data.error);
        }
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolios();
  }, []);

  const handleDeleteClick = async (portfolioId: string) => {
    try {
      const response = await fetch(
        `/api/portfolio/delete?portfolioId=${portfolioId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setPortfolios(
          portfolios.filter((portfolio) => portfolio._id !== portfolioId),
        );
      } else {
        const data = await response.json();
        console.error(data.error);
      }
    } catch (error) {
      console.error("Error deleting portfolio:", error);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {loading && <div className="py-4">Loading portfolios...</div>}
        {!loading && portfolios.length === 0 && (
          <div className="py-4">No portfolios found.</div>
        )}
        {!loading && portfolios.length > 0 && (
          <ScrollArea className="h-[300px] w-full">
            <div className="space-y-4 p-2">
              {portfolios.map((portfolio) => (
                <div
                  key={portfolio._id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{portfolio.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {portfolio.description || "No description"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(portfolio.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(portfolio._id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
