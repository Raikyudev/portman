"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ProtectedLayout from "@/app/ProtectedLayout";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface Report {
  _id: string;
  name: string;
  type: string;
  dateCreated: string;
  timePeriod: string;
  format: string;
}

export default function Page() {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  // Set today's time to 23:59:59
  today.setHours(23, 59, 59, 999);

  const [reports, setReports] = useState<Report[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  // Fetch past year's reports when the page loads
  useEffect(() => {
    const fetchDefaultReports = async () => {
      try {
        const params = new URLSearchParams();
        params.append("fromDate", oneYearAgo.toISOString());
        params.append("toDate", today.toISOString()); // Ensure the entire toDate is included

        const response = await fetch(`/api/reports?${params.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Failed to fetch default reports");
          return;
        }

        const data = await response.json();
        setReports(data.reports || []);
      } catch (error) {
        console.error("Error fetching default reports:", error);
      }
    };

    fetchDefaultReports();
  }, []);

  // Fetch reports for the selected date range when the "Sort" button is clicked
  const handleFetchReports = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("fromDate", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        // Ensure toDate includes the last second of the day
        const toDateWithTime = new Date(dateRange.to);
        toDateWithTime.setHours(23, 59, 59, 999);
        params.append("toDate", toDateWithTime.toISOString());
      }

      const response = await fetch(`/api/reports?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to fetch reports for date range");
        return;
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Error fetching reports for date range:", error);
    }
  };

  // Handle report download
  const handleDownload = async (reportId: string, fileName: string) => {
    console.log(`Starting download for reportId: ${reportId}`);
    try {
      // Use a query parameter (?id=reportId)
      const response = await fetch(`/api/reports/download?id=${reportId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Response failed with status:", response.status); // Debug log
        const errorData = await response.json();
        console.error("API error response:", errorData);
        alert(`Failed to download report: ${errorData.error}`);
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const resolvedFileName = fileNameMatch ? fileNameMatch[1] : fileName;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Report downloaded successfully:", resolvedFileName);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert(`Failed to download report: ${error}`);
    }
  };

  return (
    <ProtectedLayout>
      <div className="flex flex-col container mx-auto gap-2">
        <div className="flex justify-between items-center bg-true-black p-4 rounded-lg">
          <h1 className="text-2xl font-bold">User's Reports</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start text-left font-normal bg-background border-border text-foreground",
                      !dateRange?.from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-background border-border"
                  align="start"
                >
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={today}
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={{ after: today }}
                    numberOfMonths={2}
                    modifiers={{ today }}
                    modifiersClassNames={{
                      today: "border-2 border-red rounded",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <button
              className="bg-red rounded-md px-4 py-2 text-sm"
              onClick={handleFetchReports}
            >
              Sort
            </button>
          </div>
        </div>
        <div className="p-4 bg-true-black rounded-xl">
          <ScrollArea className="h-[60vh] w-full rounded-lg">
            {/* Table of Reports */}
            <Table
              className="bg-true-black rounded-xl border-separate"
              style={{ borderSpacing: "0 8px" }}
            >
              <TableHeader>
                <TableRow className="border-b border-gray hover:bg-true-black">
                  <TableHead className="px-4 py-2">Name</TableHead>
                  <TableHead className="px-4 py-2">Type</TableHead>
                  <TableHead className="px-4 py-2">Date Created</TableHead>
                  <TableHead className="px-4 py-2">Time Period</TableHead>
                  <TableHead className="px-4 py-2">Format</TableHead>
                  <TableHead className="px-4 py-2">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report._id} className="hover:bg-transparent">
                    <TableCell className="px-4 py-2 border-b border-gray w-1/6">
                      {report.name}
                    </TableCell>
                    <TableCell className="px-4 py-2 border-b border-gray w-1/6">
                      {report.type}
                    </TableCell>
                    <TableCell className="px-4 py-2 border-b border-gray w-1/6">
                      {report.dateCreated}
                    </TableCell>
                    <TableCell className="px-4 py-2 border-b border-gray w-2/6">
                      {report.timePeriod}
                    </TableCell>
                    <TableCell className="px-4 py-2 border-b border-gray w-1/6">
                      {report.format}
                    </TableCell>
                    <TableCell className="px-4 py-2 border-b border-gray w-1/6">
                      <button
                        onClick={() =>
                          handleDownload(
                            report._id,
                            `${report.name}.${report.format.toLowerCase()}`,
                          )
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          {/* Generate Report Button */}
          <div className="mt-6 mb-4 flex justify-center">
            <Button
              asChild
              className="bg-red text-white hover:bg-white hover:text-true-black font-semibold py-3 px-6 rounded-lg"
            >
              <Link href="/reports/generate">Generate a Report</Link>
            </Button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
