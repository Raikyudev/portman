import puppeteer from "puppeteer";
import { format } from "date-fns";

// Define the data structure
interface PortfolioData {
  fromDate?: string;
  toDate: string;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  stockHoldingsFrom: Record<string, { quantity: number; value: number }>;
  stockHoldingsTo: Record<string, { quantity: number; value: number }>;
  reportType?: string;
}

// Function to generate the PDF document
export async function generatePDF(data: PortfolioData): Promise<Buffer> {
  try {
    // Validate and format the input data
    const isSummaryReport = !data.fromDate;
    const formattedToDate = format(new Date(data.toDate), "dd-MM-yyyy");
    const formattedFromDate = data.fromDate
      ? format(new Date(data.fromDate), "dd-MM-yyyy")
      : null;

    // Prepare table data for stock holdings
    const allTickers = Array.from(
      new Set([
        ...Object.keys(data.stockHoldingsFrom),
        ...Object.keys(data.stockHoldingsTo),
      ]),
    );

    // Generate stock holdings rows
    const stockHoldingsRows = allTickers.map((ticker) => {
      const fromHolding = data.stockHoldingsFrom[ticker] || {
        quantity: 0,
        value: 0,
      };
      const toHolding = data.stockHoldingsTo[ticker] || {
        quantity: 0,
        value: 0,
      };
      return isSummaryReport
        ? `<tr>
             <td>${ticker}</td>
             <td>${toHolding.quantity}</td>
             <td>$${toHolding.value.toFixed(2)}</td>
           </tr>`
        : `<tr>
             <td>${ticker}</td>
             <td>${fromHolding.quantity}</td>
             <td>$${fromHolding.value.toFixed(2)}</td>
             <td>${toHolding.quantity}</td>
             <td>$${toHolding.value.toFixed(2)}</td>
           </tr>`;
    });

    // Generate portfolio value row
    const portfolioValueRow = isSummaryReport
      ? `<tr>
           <td>Portfolio Value</td>
           <td>$${data.portfolioValueTo.toFixed(2)}</td>
         </tr>`
      : `<tr>
           <td>Portfolio Value</td>
           <td>$${data.portfolioValueFrom.toFixed(2)}</td>
           <td>$${data.portfolioValueTo.toFixed(2)}</td>
         </tr>`;

    // Define the HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 30px;
          }
          h1 {
            text-align: center;
            color: #333;
          }
          .subheader {
            margin: 10px 0;
            font-size: 14px;
            color: #555;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f4f4f4;
            font-weight: bold;
          }
          .section-header {
            margin: 20px 0 10px;
            font-size: 16px;
            color: #222;
            font-weight: bold;
          }
        </style><title>Report</title>
      </head>
      <body>
        <h1>${isSummaryReport ? "Portfolio Summary Report" : "Portfolio Report"}</h1>
        <p class="subheader">Report Date: ${formattedToDate}</p>
        ${
          formattedFromDate
            ? `<p class="subheader">From Date: ${formattedFromDate}</p>`
            : ""
        }

        <div>
          <h2 class="section-header">Stock Holdings</h2>
          <table>
            <thead>
              <tr>
                <th>Stock Name</th>
                ${
                  isSummaryReport
                    ? `<th>Shares (${formattedToDate})</th>
                       <th>Value (${formattedToDate})</th>`
                    : `<th>Shares (${formattedFromDate})</th>
                       <th>Value (${formattedFromDate})</th>
                       <th>Shares (${formattedToDate})</th>
                       <th>Value (${formattedToDate})</th>`
                }
              </tr>
            </thead>
            <tbody>
              ${stockHoldingsRows.join("")}
            </tbody>
          </table>
        </div>

        <div>
          <h2 class="section-header">Portfolio Value</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                ${
                  isSummaryReport
                    ? `<th>Value (${formattedToDate})</th>`
                    : `<th>Value (${formattedFromDate})</th>
                       <th>Value (${formattedToDate})</th>`
                }
              </tr>
            </thead>
            <tbody>
              ${portfolioValueRow}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    // Launch Puppeteer and generate the PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({
      format: "A4", // Page format
      printBackground: true, // Include CSS background colors
    });
    await browser.close();

    return Buffer.from(pdfBuffer); // Convert Uint8Array to Buffer and return
  } catch (error) {
    console.error("Error generating PDF", error);
    throw error;
  }
}
