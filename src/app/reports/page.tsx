"use client";

import { useState, useEffect } from "react";
import PortfolioSelect from "@/components/PortfolioSelect";
import DateInput from "@/components/DateInput";
import FormatSelect from "@/components/ReportFormatSelect";
import GenerateButton from "@/components/GenerateReportButton";

export default function ReportGenerator() {
  const [portfolios, setPortfolios] = useState<{ _id: string; name: string }[]>(
    [],
  );
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPortfolios() {
      try {
        const response = await fetch("/api/portfolio");
        if (!response.ok) {
          console.error("Failed to fetch portfolios");
          return;
        }
        const data = await response.json();
        setPortfolios(data);
        if (data.length > 0) setSelectedPortfolio(data[0]._id);
      } catch (error) {
        console.error(error);
      }
    }
    fetchPortfolios().then(() => {});
  }, []);

  return (
    <div>
      <h1>Generate Portfolio Report</h1>

      <div>
        <PortfolioSelect
          portfolios={portfolios}
          selectedPortfolio={selectedPortfolio}
          setSelectedPortfolio={setSelectedPortfolio}
        />

        <DateInput label="From Date" value={fromDate} setValue={setFromDate} />
        <DateInput label="To Date" value={toDate} setValue={setToDate} />

        <FormatSelect format={format} setFormat={setFormat} />

        <GenerateButton
          loading={loading}
          setLoading={setLoading}
          portfolioId={selectedPortfolio}
          fromDate={fromDate}
          toDate={toDate}
          format={format}
        />
      </div>
    </div>
  );
}
