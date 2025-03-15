"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Ensure ScrollBar is imported
import ProtectedLayout from "@/app/ProtectedLayout";

export default function Page() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Mock data for the table (replace with actual API call if needed)
  const reports = Array(10).fill({
    name: "Dividend summary",
    type: "income report",
    dateCreated: "01/01/2025",
    timePeriod: "01/12/2024 - 31/12/2024",
    format: "PDF",
    size: "20 MB",
  });

  return (
      <ProtectedLayout>
        <div className="flex flex-col container mx-auto gap-4 ">

          <div className="flex justify-end mb-4 space-x-4 bg-true-black p-4 rounded-lg">
            <h1 className="text-2xl font-bold">User&apos;s Reports</h1>
            <div className="flex items-center space-x-2">
              <label className="text-sm">From</label>
              <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-background border-border text-foreground"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm">To</label>
              <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-background border-border text-foreground"
              />
            </div>
            <button className="bg-red rounded-md px-4 py-2 text-sm">
              Sort
            </button>
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
                    <TableHead className="px-4 py-2">Size</TableHead>
                    <TableHead className="px-4 py-2">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report, index) => (
                      <TableRow key={index} className="hover:bg-transparent">
                        <TableCell className="px-4 py-2 border-b border-gray w-1/7">
                          {report.name}
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-gray w-1/7">
                          {report.type}
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-gray w-1/7">
                          {report.dateCreated}
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-gray w-2/7">
                          {report.timePeriod}
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-gray w-1/7">
                          {report.format}
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-gray w-1/7">
                          {report.size}
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b border-gray w-1/7">
                          <button>
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
                  className="bg-red text-white font-semibold py-3 px-6 rounded-lg"
              >
                <Link href="/reports/generate">Generate a Report</Link>
              </Button>
            </div>
          </div>
        </div>

      </ProtectedLayout>
  );
}