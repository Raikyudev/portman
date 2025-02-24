import { Parser } from "@json2csv/plainjs";
import ExcelJS from "exceljs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export function generateCSV(data: {
  fromDate: string;
  toDate: string;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  stockHoldings: Record<string, number>;
}) {
  const parser = new Parser({ fields: Object.keys(data) });
  return parser.parse([data]);
}

export async function generateExcel(data: {
  fromDate: string;
  toDate: string;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  stockHoldings: Record<string, number>;
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Portfolio Report");

  // Define headers
  sheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 30 },
  ];

  // Add data rows
  const rows = [
    ["From Date", data.fromDate],
    ["To Date", data.toDate],
    ["Portfolio Value (From)", data.portfolioValueFrom],
    ["Portfolio Value (To)", data.portfolioValueTo],
    ["Stock Holdings", JSON.stringify(data.stockHoldings, null, 2)],
  ];

  rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generatePDF(data: {
  fromDate: string;
  toDate: string;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  stockHoldings: Record<string, number>;
}) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 500]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  let yPosition = height - 50;

  page.drawText("Portfolio Report", {
    x: 50,
    y: yPosition,
    font,
    size: 18,
    color: rgb(0, 0, 0),
  });
  yPosition -= 30;

  const summary = [
    `From Date: ${data.fromDate}`,
    `To Date: ${data.toDate}`,
    `Portfolio Value (From): ${data.portfolioValueFrom} USD`,
    `Portfolio Value (To): ${data.portfolioValueTo} USD`,
  ];

  summary.forEach((text) => {
    page.drawText(text, { x: 50, y: yPosition, font, size: 12 });
    yPosition -= 20;
  });

  page.drawText("Stock Holdings:", { x: 50, y: yPosition, font, size: 14 });
  yPosition -= 20;

  Object.entries(data.stockHoldings).forEach(([ticker, quantity]) => {
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
