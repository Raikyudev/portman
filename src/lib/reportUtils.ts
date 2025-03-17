import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { format, parseISO } from "date-fns";

export async function generatePDF(data: {
  fromDate: string | undefined;
  toDate: string;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  stockHoldingsFrom: Record<string, { quantity: number; value: number }>;
  stockHoldingsTo: Record<string, { quantity: number; value: number }>;
}) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  let yPosition = height - 50;

  // Determine report type based on fromDate
  const isSummaryReport = !data.fromDate;

  // Format dates to 'yyyy-MM-dd'
  const formattedToDate = format(parseISO(data.toDate), "yyyy-MM-dd");
  let formattedFromDate: string | undefined;
  if (data.fromDate) {
    formattedFromDate = format(parseISO(data.fromDate), "yyyy-MM-dd");
  }

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
  const summary = [`Report Date: ${formattedToDate}`];
  if (!isSummaryReport && formattedFromDate) {
    summary.unshift(`From Date: ${formattedFromDate}`);
  }

  summary.forEach((text) => {
    page.drawText(text, { x: 50, y: yPosition, font, size: 12 });
    yPosition -= 20;
  });

  yPosition -= 20; // Add some spacing before the table

  // Define table dimensions and column widths
  const tableX = 50;
  const tableWidth = 500;
  const columnWidths = isSummaryReport
    ? [150, 175, 175] // For summary report: Stock Name, Shares (To), Value (To)
    : [100, 100, 100, 100, 100]; // For range report: Stock Name, Shares (From), Value (From), Shares (To), Value (To)
  const rowHeight = 30; // Height for data rows
  const headerRowHeight = 40; // Height for header rows
  const tableStartY = yPosition - 20; // Adjust starting position to align with title

  // Draw table headers for stock holdings
  page.drawText("Stock Holdings", {
    x: tableX,
    y: yPosition,
    font,
    size: 14,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  // Draw top border for the table
  page.drawLine({
    start: { x: tableX, y: yPosition + 5 },
    end: { x: tableX + tableWidth, y: yPosition + 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Draw table header row with dates on a separate line
  const headerY = yPosition;
  let currentX = tableX;

  if (isSummaryReport) {
    // Headers for summary report
    const headers = ["Stock Name", "Shares", "Value"];
    const dates = ["", `(${formattedToDate})`, `(${formattedToDate})`];
    headers.forEach((header, index) => {
      const textWidth = font.widthOfTextAtSize(header, 12);
      const dateWidth = font.widthOfTextAtSize(dates[index], 10);
      const xPosHeader = currentX + (columnWidths[index] - textWidth) / 2; // Horizontal centering
      const xPosDate = currentX + (columnWidths[index] - dateWidth) / 2; // Horizontal centering
      // Vertically center the header text and date as a unit within headerRowHeight
      const headerTextHeight = 12;
      const dateTextHeight = 10;
      const totalHeaderUnitHeight = headerTextHeight + dateTextHeight + 5;
      const headerTextY =
        headerY - (headerRowHeight - totalHeaderUnitHeight) / 2;
      const dateTextY = headerTextY - headerTextHeight - 5;
      page.drawText(header, { x: xPosHeader, y: headerTextY, font, size: 12 });
      if (dates[index]) {
        page.drawText(dates[index], {
          x: xPosDate,
          y: dateTextY,
          font,
          size: 10,
        });
      }
      currentX += columnWidths[index];
    });
  } else {
    // Headers for range report
    const headers = ["Stock Name", "Shares", "Value", "Shares", "Value"];
    const dates = [
      "",
      `(${formattedFromDate})`,
      `(${formattedFromDate})`,
      `(${formattedToDate})`,
      `(${formattedToDate})`,
    ];
    headers.forEach((header, index) => {
      const textWidth = font.widthOfTextAtSize(header, 12);
      const dateWidth = font.widthOfTextAtSize(dates[index], 10);
      const xPosHeader = currentX + (columnWidths[index] - textWidth) / 2; // Horizontal centering
      const xPosDate = currentX + (columnWidths[index] - dateWidth) / 2; // Horizontal centering
      // Vertically center the header text and date as a unit within headerRowHeight
      const headerTextHeight = 12;
      const dateTextHeight = 10;
      const totalHeaderUnitHeight = headerTextHeight + dateTextHeight + 5;
      const headerTextY =
        headerY - (headerRowHeight - totalHeaderUnitHeight) / 2;
      const dateTextY = headerTextY - headerTextHeight - 5;
      page.drawText(header, { x: xPosHeader, y: headerTextY, font, size: 12 });
      if (dates[index]) {
        page.drawText(dates[index], {
          x: xPosDate,
          y: dateTextY,
          font,
          size: 10,
        });
      }
      currentX += columnWidths[index];
    });
  }

  // Draw horizontal line below header
  yPosition = headerY - headerRowHeight;
  page.drawLine({
    start: { x: tableX, y: yPosition },
    end: { x: tableX + tableWidth, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  yPosition -= rowHeight;

  // Combine stock holdings into a single table
  const allTickers = Array.from(
    new Set([
      ...Object.keys(data.stockHoldingsFrom),
      ...Object.keys(data.stockHoldingsTo),
    ]),
  );

  // Draw rows for stock holdings
  allTickers.forEach((ticker) => {
    if (yPosition < 50) {
      page = pdfDoc.addPage([600, 800]);
      yPosition = height - 50;
      // Redraw top border and headers on new page if needed
      page.drawText("Stock Holdings", {
        x: tableX,
        y: height - 50,
        font,
        size: 14,
        color: rgb(0, 0, 0),
      });
      yPosition = height - 70;
      page.drawLine({
        start: { x: tableX, y: yPosition + 5 },
        end: { x: tableX + tableWidth, y: yPosition + 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      // Redraw headers
      const headerYNew = yPosition;
      currentX = tableX;
      if (isSummaryReport) {
        const headers = ["Stock Name", "Shares", "Value"];
        const dates = ["", `(${formattedToDate})`, `(${formattedToDate})`];
        headers.forEach((header, index) => {
          const textWidth = font.widthOfTextAtSize(header, 12);
          const dateWidth = font.widthOfTextAtSize(dates[index], 10);
          const xPosHeader = currentX + (columnWidths[index] - textWidth) / 2;
          const xPosDate = currentX + (columnWidths[index] - dateWidth) / 2;
          const headerTextHeight = 12;
          const dateTextHeight = 10;
          const totalHeaderUnitHeight = headerTextHeight + dateTextHeight + 5;
          const headerTextY =
            headerYNew - (headerRowHeight - totalHeaderUnitHeight) / 2;
          const dateTextY = headerTextY - headerTextHeight - 5;
          page.drawText(header, {
            x: xPosHeader,
            y: headerTextY,
            font,
            size: 12,
          });
          if (dates[index]) {
            page.drawText(dates[index], {
              x: xPosDate,
              y: dateTextY,
              font,
              size: 10,
            });
          }
          currentX += columnWidths[index];
        });
      } else {
        const headers = ["Stock Name", "Shares", "Value", "Shares", "Value"];
        const dates = [
          "",
          `(${formattedFromDate})`,
          `(${formattedFromDate})`,
          `(${formattedToDate})`,
          `(${formattedToDate})`,
        ];
        headers.forEach((header, index) => {
          const textWidth = font.widthOfTextAtSize(header, 12);
          const dateWidth = font.widthOfTextAtSize(dates[index], 10);
          const xPosHeader = currentX + (columnWidths[index] - textWidth) / 2;
          const xPosDate = currentX + (columnWidths[index] - dateWidth) / 2;
          const headerTextHeight = 12;
          const dateTextHeight = 10;
          const totalHeaderUnitHeight = headerTextHeight + dateTextHeight + 5;
          const headerTextY =
            headerYNew - (headerRowHeight - totalHeaderUnitHeight) / 2;
          const dateTextY = headerTextY - headerTextHeight - 5;
          page.drawText(header, {
            x: xPosHeader,
            y: headerTextY,
            font,
            size: 12,
          });
          if (dates[index]) {
            page.drawText(dates[index], {
              x: xPosDate,
              y: dateTextY,
              font,
              size: 10,
            });
          }
          currentX += columnWidths[index];
        });
      }
      yPosition = headerYNew - headerRowHeight;
      page.drawLine({
        start: { x: tableX, y: yPosition },
        end: { x: tableX + tableWidth, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= rowHeight;
    }

    const fromHolding = data.stockHoldingsFrom[ticker] || {
      quantity: 0,
      value: 0,
    };
    const toHolding = data.stockHoldingsTo[ticker] || { quantity: 0, value: 0 };

    currentX = tableX;

    if (isSummaryReport) {
      // Summary report: only show toDate data
      const entries = [
        ticker,
        `${toHolding.quantity}`,
        `$${toHolding.value.toFixed(2)}`,
      ];
      entries.forEach((entry, colIndex) => {
        const textWidth = font.widthOfTextAtSize(entry, 12);
        const xPos = currentX + (columnWidths[colIndex] - textWidth) / 2; // Horizontal centering
        const yPos = yPosition + rowHeight / 2 - 6; // Vertically center within rowHeight (adjust for font size)
        page.drawText(entry, { x: xPos, y: yPos, font, size: 12 });
        currentX += columnWidths[colIndex];
      });
    } else {
      // Range report: show both fromDate and toDate data
      const entries = [
        ticker,
        `${fromHolding.quantity}`,
        `$${fromHolding.value.toFixed(2)}`,
        `${toHolding.quantity}`,
        `$${toHolding.value.toFixed(2)}`,
      ];
      entries.forEach((entry, colIndex) => {
        const textWidth = font.widthOfTextAtSize(entry, 12);
        const xPos = currentX + (columnWidths[colIndex] - textWidth) / 2; // Horizontal centering
        const yPos = yPosition + rowHeight / 2 - 6; // Vertically center within rowHeight (adjust for font size)
        page.drawText(entry, { x: xPos, y: yPos, font, size: 12 });
        currentX += columnWidths[colIndex];
      });
    }

    // Draw horizontal line below each row
    yPosition -= rowHeight;
    page.drawLine({
      start: { x: tableX, y: yPosition + rowHeight },
      end: { x: tableX + tableWidth, y: yPosition + rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  });

  // Draw vertical lines for the table (complete border)
  currentX = tableX;
  for (let i = 0; i <= columnWidths.length; i++) {
    page.drawLine({
      start: { x: currentX, y: tableStartY + 5 },
      end: { x: currentX, y: yPosition + rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (i < columnWidths.length) {
      currentX += columnWidths[i];
    }
  }

  // Draw bottom horizontal line
  page.drawLine({
    start: { x: tableX, y: yPosition + rowHeight },
    end: { x: tableX + tableWidth, y: yPosition + rowHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Add portfolio value table
  yPosition -= 40; // Add some spacing before the portfolio value table

  // Draw portfolio value table header
  page.drawText("Portfolio Value", {
    x: tableX,
    y: yPosition,
    font,
    size: 14,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  const portfolioTableStartY = yPosition;
  currentX = tableX;
  const portfolioColumnWidths = isSummaryReport ? [150, 350] : [150, 175, 175]; // Adjust for summary vs range report

  // Draw top border for the portfolio value table
  page.drawLine({
    start: { x: tableX, y: yPosition + 5 },
    end: { x: tableX + tableWidth, y: yPosition + 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Draw table header row with dates on a separate line
  const portfolioHeaderY = yPosition;
  currentX = tableX;

  if (isSummaryReport) {
    const headers = ["Description", "Value"];
    const dates = ["", `(${formattedToDate})`];
    headers.forEach((header, index) => {
      const textWidth = font.widthOfTextAtSize(header, 12);
      const dateWidth = font.widthOfTextAtSize(dates[index], 10);
      const xPosHeader =
        currentX + (portfolioColumnWidths[index] - textWidth) / 2; // Horizontal centering
      const xPosDate =
        currentX + (portfolioColumnWidths[index] - dateWidth) / 2; // Horizontal centering
      // Vertically center the header text and date as a unit within headerRowHeight
      const headerTextHeight = 12;
      const dateTextHeight = 10;
      const totalHeaderUnitHeight = headerTextHeight + dateTextHeight + 5;
      const headerTextY =
        portfolioHeaderY - (headerRowHeight - totalHeaderUnitHeight) / 2;
      const dateTextY = headerTextY - headerTextHeight - 5;
      page.drawText(header, { x: xPosHeader, y: headerTextY, font, size: 12 });
      if (dates[index]) {
        page.drawText(dates[index], {
          x: xPosDate,
          y: dateTextY,
          font,
          size: 10,
        });
      }
      currentX += portfolioColumnWidths[index];
    });
  } else {
    const headers = ["Description", "Value", "Value"];
    const dates = ["", `(${formattedFromDate})`, `(${formattedToDate})`];
    headers.forEach((header, index) => {
      const textWidth = font.widthOfTextAtSize(header, 12);
      const dateWidth = font.widthOfTextAtSize(dates[index], 10);
      const xPosHeader =
        currentX + (portfolioColumnWidths[index] - textWidth) / 2; // Horizontal centering
      const xPosDate =
        currentX + (portfolioColumnWidths[index] - dateWidth) / 2; // Horizontal centering
      // Vertically center the header text and date as a unit within headerRowHeight
      const headerTextHeight = 12;
      const dateTextHeight = 10;
      const totalHeaderUnitHeight = headerTextHeight + dateTextHeight + 5;
      const headerTextY =
        portfolioHeaderY - (headerRowHeight - totalHeaderUnitHeight) / 2;
      const dateTextY = headerTextY - headerTextHeight - 5;
      page.drawText(header, { x: xPosHeader, y: headerTextY, font, size: 12 });
      if (dates[index]) {
        page.drawText(dates[index], {
          x: xPosDate,
          y: dateTextY,
          font,
          size: 10,
        });
      }
      currentX += portfolioColumnWidths[index];
    });
  }

  // Draw horizontal line below header
  yPosition = portfolioHeaderY - headerRowHeight;
  page.drawLine({
    start: { x: tableX, y: yPosition },
    end: { x: tableX + tableWidth, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  yPosition -= rowHeight;

  // Draw portfolio value row
  currentX = tableX;
  if (isSummaryReport) {
    const entries = ["Portfolio Value", `$${data.portfolioValueTo.toFixed(2)}`];
    entries.forEach((entry, colIndex) => {
      const textWidth = font.widthOfTextAtSize(entry, 12);
      const xPos = currentX + (portfolioColumnWidths[colIndex] - textWidth) / 2; // Horizontal centering
      const yPos = yPosition + rowHeight / 2 - 6; // Vertically center within rowHeight (adjust for font size)
      page.drawText(entry, { x: xPos, y: yPos, font, size: 12 });
      currentX += portfolioColumnWidths[colIndex];
    });
  } else {
    const entries = [
      "Portfolio Value",
      `$${data.portfolioValueFrom.toFixed(2)}`,
      `$${data.portfolioValueTo.toFixed(2)}`,
    ];
    entries.forEach((entry, colIndex) => {
      const textWidth = font.widthOfTextAtSize(entry, 12);
      const xPos = currentX + (portfolioColumnWidths[colIndex] - textWidth) / 2; // Horizontal centering
      const yPos = yPosition + rowHeight / 2 - 6; // Vertically center within rowHeight (adjust for font size)
      page.drawText(entry, { x: xPos, y: yPos, font, size: 12 });
      currentX += portfolioColumnWidths[colIndex];
    });
  }

  // Draw horizontal line below the portfolio value row
  yPosition -= rowHeight;
  page.drawLine({
    start: { x: tableX, y: yPosition + rowHeight },
    end: { x: tableX + tableWidth, y: yPosition + rowHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Draw vertical lines for the portfolio value table (complete border)
  currentX = tableX;
  for (let i = 0; i <= portfolioColumnWidths.length; i++) {
    page.drawLine({
      start: { x: currentX, y: portfolioTableStartY + 5 },
      end: { x: currentX, y: yPosition + rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (i < portfolioColumnWidths.length) {
      currentX += portfolioColumnWidths[i];
    }
  }

  // Draw bottom horizontal line for portfolio value table
  page.drawLine({
    start: { x: tableX, y: yPosition + rowHeight },
    end: { x: tableX + tableWidth, y: yPosition + rowHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  return await pdfDoc.save();
}
