// Generate Report Button

import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
  portfolioId: string;
  fromDate: string;
  toDate: string;
  format: string;
}

export default function GenerateButton({
  loading,
  setLoading,
  portfolioId,
  fromDate,
  toDate,
  format,
}: GenerateButtonProps) {
  // Handle report generation
  const handleGenerateReport = async () => {
    if (!portfolioId || !fromDate || !toDate) {
      alert("Please select a portfolio and both dates.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          reportType: "portfolio_report",
          format,
          fromDate,
          toDate,
        }),
      });

      if (!response.ok) {
        console.error("Failed to generate report");
        return;
      }

      // Prepare file for download
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = `portfolio_report.${format}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      alert("Error generating report. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerateReport}
      disabled={loading}
      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg"
    >
      {loading ? "Generating..." : "Generate a Report"}
    </Button>
  );
}
