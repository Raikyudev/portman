// lib/reportUtils.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generatePDF(data: {
  fromDate: string | undefined;
  toDate: string;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  stockHoldingsFrom: Record<string, number>;
  stockHoldingsTo: Record<string, number>;
}) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 500]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  let yPosition = height - 50;

  // Determine report type based on fromDate
  const isSummaryReport = !data.fromDate;

  // Set title based on report type
  page.drawText(
    isSummaryReport ? "Portfolio Summary Report" : "Portfolio Report",
    {
      x: 50,
      y: yPosition,
      font,
      size: 18,
      color: rgb(0, 0, 0),
    },
  );
  yPosition -= 30;

  // Add summary section
  const summary = [
    `Report Date: ${data.toDate}`,
    `Portfolio Value: ${data.portfolioValueTo} USD`,
  ];

  if (!isSummaryReport) {
    summary.unshift(`From Date: ${data.fromDate}`);
    summary.push(`Portfolio Value (From): ${data.portfolioValueFrom} USD`);
  }

  summary.forEach((text) => {
    page.drawText(text, { x: 50, y: yPosition, font, size: 12 });
    yPosition -= 20;
  });

  // Add stock holdings
  if (!isSummaryReport) {
    // Add stock holdings for fromDate
    page.drawText("Stock Holdings (From Date):", {
      x: 50,
      y: yPosition,
      font,
      size: 14,
    });
    yPosition -= 20;
    Object.entries(data.stockHoldingsFrom).forEach(([ticker, quantity]) => {
      if (yPosition < 50) {
        page = pdfDoc.addPage([600, 500]);
        yPosition = height - 50;
      }
      page.drawText(`${ticker}: ${quantity} shares`, {
        x: 50,
        y: yPosition,
        font,
        size: 12,
      });
      yPosition -= 20;
    });
  }

  // Add stock holdings for toDate
  yPosition = height - 50; // Reset yPosition for a new page or section
  page = pdfDoc.addPage([600, 500]); // Start a new page for toDate holdings
  page.drawText("Stock Holdings (Report Date):", {
    x: 50,
    y: yPosition,
    font,
    size: 14,
  });
  yPosition -= 20;
  Object.entries(data.stockHoldingsTo).forEach(([ticker, quantity]) => {
    if (yPosition < 50) {
      page = pdfDoc.addPage([600, 500]);
      yPosition = height - 50;
    }
    page.drawText(`${ticker}: ${quantity} shares`, {
      x: 50,
      y: yPosition,
      font,
      size: 12,
    });
    yPosition -= 20;
  });

  return await pdfDoc.save();
}
