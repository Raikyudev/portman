// Portfolio Settings List component

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Portfolio {
  _id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function PortfolioSettingsList() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Fetch user portfolios when component loads
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

  // Open delete dialog
  const handleDeleteClick = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    setIsDeleteDialogOpen(true);
  };

  // Confirm and delete portfolio
  const confirmDeletePortfolio = async () => {
    if (!selectedPortfolio) return;

    try {
      const response = await fetch(
        `/api/portfolio/delete?portfolioId=${selectedPortfolio._id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setPortfolios(
          portfolios.filter(
            (portfolio) => portfolio._id !== selectedPortfolio._id,
          ),
        );
        setIsDeleteDialogOpen(false);
        setSelectedPortfolio(null);
      } else {
        const data = await response.json();
        console.error(data.error);
      }
    } catch (error) {
      console.error("Error deleting portfolio:", error);
    }
  };

  // Open edit dialog
  const handleEditClick = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    setEditName(portfolio.name);
    setEditDescription(portfolio.description);
    setIsEditDialogOpen(true);
  };

  // Submit edit changes
  const handleEditSubmit = async () => {
    if (!selectedPortfolio) return;

    try {
      const response = await fetch("/api/portfolio/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          portfolioId: selectedPortfolio._id,
          name: editName,
          description: editDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPortfolios(
          portfolios.map((portfolio) =>
            portfolio._id === selectedPortfolio._id
              ? { ...portfolio, name: editName, description: editDescription }
              : portfolio,
          ),
        );
        setIsEditDialogOpen(false);
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error("Error updating portfolio:", error);
    }
  };

  return (
    <Card className="bg-true-black no-border">
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
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(portfolio)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(portfolio)}
                      className="bg-red hover:bg-white hover:text-true-black"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Portfolio Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter portfolio name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this portfolio?</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePortfolio}
              className="bg-red hover:bg-white hover:text-true-black"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
