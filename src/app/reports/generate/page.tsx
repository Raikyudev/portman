"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ProtectedLayout from "@/app/ProtectedLayout";
import PortfolioDropdown from "@/components/PortfolioDropdown";
import { IExtendedPortfolio } from "@/types/portfolio";

export default function GenerateReportPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [portfolios, setPortfolios] = useState<IExtendedPortfolio[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioDescription, setNewPortfolioDescription] = useState("");

  // Mock report types (adjust based on your needs)
  const reportTypes = [
    { value: "income_report", label: "Income Report" },
    { value: "portfolio_report", label: "Portfolio Report" },
    { value: "summary", label: "Summary" },
  ];

  // Determine if the type requires a portfolio selection
  const requiresPortfolio = type === "portfolio_report"; // Adjust this condition based on your logic

  useEffect(() => {
    const fetchPortfolios = async () => {
      setLoadingPortfolios(true);
      try {
        const response = await fetch("/api/portfolio", {
          credentials: "include",
        });
        if (!response.ok) {
          console.error("Error fetching portfolios");
          return;
        }
        const data = await response.json();
        setPortfolios(data); // Assuming data is an array of portfolios
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      } finally {
        setLoadingPortfolios(false);
      }
    };
    fetchPortfolios();
  }, []);

  const handleGenerateReport = async () => {
    // Logic to generate the report (similar to your original GenerateButton logic)
    console.log("Generating report:", {
      name,
      type,
      selectedPortfolio,
      fromDate,
      toDate,
    });
    // Add your API call here to generate the report
  };

  return (
    <ProtectedLayout>
      <div className="p-6 bg-true-black rounded-xl">
        <div className="w-[90%] mx-auto min-w-[600px] max-w-[1200px] bg-true-black">
          <Card className="bg-true-black no-border w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Generate Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Section: Form Inputs */}
                <div className="flex-1 space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm text-foreground">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter report name"
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  {/* Report Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm text-foreground">
                      Report Type
                    </Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border text-foreground">
                        {reportTypes.map((reportType) => (
                          <SelectItem
                            key={reportType.value}
                            value={reportType.value}
                          >
                            {reportType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional Portfolio Selection with PortfolioDropdown */}
                  {requiresPortfolio && !loadingPortfolios && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="portfolio"
                          className="text-sm text-foreground"
                        >
                          Select Your Portfolio
                        </Label>
                      </div>
                      <PortfolioDropdown
                        portfolios={portfolios}
                        onPortfolioSelect={(portfolioId) =>
                          setSelectedPortfolio(portfolioId)
                        }
                        initialPortfolioId={portfolios[0]?._id.toString()}
                        create={false} // Hide the AddPortfolioPopover in the dropdown
                      />
                    </div>
                  )}

                  {/* From Date */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="fromDate"
                      className="text-sm text-foreground"
                    >
                      From Date
                    </Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  {/* To Date */}
                  <div className="space-y-2">
                    <Label htmlFor="toDate" className="text-sm text-foreground">
                      To Date
                    </Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                {/* Right Section: Create New Portfolio (Conditional) */}
                {showCreatePortfolio && (
                  <div className="flex-1">
                    <Card className="bg-background border-red-500">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-semibold">
                          Create New Portfolio
                        </CardTitle>
                        <Button
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => setShowCreatePortfolio(false)}
                        >
                          ✕
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Portfolio Name */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="newPortfolioName"
                            className="text-sm text-foreground"
                          >
                            Portfolio Name
                          </Label>
                          <Input
                            id="newPortfolioName"
                            value={newPortfolioName}
                            onChange={(e) =>
                              setNewPortfolioName(e.target.value)
                            }
                            placeholder="Enter portfolio name"
                            className="bg-background border-border text-foreground"
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="newPortfolioDescription"
                            className="text-sm text-foreground"
                          >
                            Description (optional)
                          </Label>
                          <Input
                            id="newPortfolioDescription"
                            value={newPortfolioDescription}
                            onChange={(e) =>
                              setNewPortfolioDescription(e.target.value)
                            }
                            placeholder="Type your description"
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Generate Report Button */}
              <div className="mt-6">
                <Button
                  onClick={handleGenerateReport}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg w-full"
                >
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
