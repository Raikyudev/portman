import puppeteer from "puppeteer";
import { format } from "date-fns";
import { PortfolioData } from "@/types/portfolio";
import {
  getAIPredictions,
  getAIRecommendations,
  AIPrediction,
} from "@/lib/AIUtils";
import { getTodayPriceBySymbol } from "@/lib/stockPrices";

export async function generatePDF(data: PortfolioData): Promise<Buffer> {
  try {
    const isSummaryReport = data.reportType === "summary";
    const formattedToDate = format(new Date(data.toDate), "dd-MM-yyyy");
    const formattedFromDate = data.fromDate
      ? format(new Date(data.fromDate), "dd-MM-yyyy")
      : null;

    let htmlContent = `
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
          th,
          td {
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
          .portfolio-header {
            margin: 15px 0 5px;
            font-size: 14px;
            color: #333;
            font-weight: bold;
          }
          .profit-positive {
            color: green;
          }
          .profit-negative {
            color: red;
          }
        </style>
        <title>${data.reportType} Report</title>
      </head>
      <body>
        <h1>${
          data.reportType === "income_report"
            ? "Income Report"
            : data.reportType === "portfolio_report"
              ? "Portfolio Report"
              : data.reportType === "summary"
                ? "Summary Report"
                : data.reportType === "ai_portfolio_summary"
                  ? "AI Portfolio Summary"
                  : "AI Account Summary"
        }</h1>
        <p class="subheader">Report Date: ${formattedToDate}</p>
        <div>
          <h2 class="section-header">Portfolios Included</h2>
          ${data.portfolios
            .map(
              (portfolio) => `
              <p>${portfolio.name} ${portfolio.description ? ` - ${portfolio.description}` : ""}</p>
            `,
            )
            .join("")}
        </div>
    `;

    switch (data.reportType) {
      case "income_report":
        htmlContent += `
          <div>
            <h2 class="section-header">Income Overview</h2>
            <p>Income Report: Listing stock values over time.</p>
            ${data.portfolios
              .map((portfolio) => {
                const portfolioId = portfolio._id;
                const holdings = data.portfolioHoldings[portfolioId] || {
                  stockHoldingsFrom: {},
                  stockHoldingsTo: {},
                  portfolioValueFrom: 0,
                  portfolioValueTo: 0,
                  periodProfits: {},
                };
                const allTickers = Array.from(
                  new Set([
                    ...Object.keys(holdings.stockHoldingsFrom),
                    ...Object.keys(holdings.stockHoldingsTo),
                  ]),
                );
                const totalPeriodProfit = Object.values(
                  holdings.periodProfits || {},
                ).reduce((sum, profit) => sum + (profit || 0), 0);
                return `
                  <div>
                    <h3 class="portfolio-header">${portfolio.name}  ${
                      " - " + portfolio.description || ""
                    }</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Stock</th>
                          <th>Shares (${formattedFromDate || "N/A"})</th>
                          <th>Value From (${formattedFromDate || "N/A"})</th>
                          <th>Shares (${formattedToDate})</th>
                          <th>Value To (${formattedToDate})</th>
                          <th>Profit Over Period ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${allTickers
                          .map((ticker) => {
                            const fromHolding = holdings.stockHoldingsFrom[
                              ticker
                            ] || {
                              quantity: 0,
                              value: 0,
                            };
                            const toHolding = holdings.stockHoldingsTo[
                              ticker
                            ] || {
                              quantity: 0,
                              value: 0,
                            };
                            const periodProfit =
                              holdings.periodProfits?.[ticker] || 0;
                            const periodProfitClass =
                              periodProfit >= 0
                                ? "profit-positive"
                                : "profit-negative";
                            return `
                              <tr>
                                <td>${ticker}</td>
                                <td>${fromHolding.quantity}</td>
                                <td>$${fromHolding.value.toFixed(2)}</td>
                                <td>${toHolding.quantity}</td>
                                <td>$${toHolding.value.toFixed(2)}</td>
                                <td class="${periodProfitClass}">$${periodProfit.toFixed(
                                  2,
                                )}</td>
                              </tr>
                            `;
                          })
                          .join("")}
                      </tbody>
                    </table>
                    <p>Total Profit Over Period for ${
                      portfolio.name
                    }: <span class="${
                      totalPeriodProfit >= 0
                        ? "profit-positive"
                        : "profit-negative"
                    }">$${totalPeriodProfit.toFixed(2)}</span></p>
                  </div>
                `;
              })
              .join("")}
          </div>
        `;
        break;

      case "portfolio_report":
        htmlContent += `
          <div>
            ${data.portfolios
              .map((portfolio) => {
                const portfolioId = portfolio._id;
                const holdings = data.portfolioHoldings[portfolioId] || {
                  stockHoldingsFrom: {},
                  stockHoldingsTo: {},
                  portfolioValueFrom: 0,
                  portfolioValueTo: 0,
                  periodProfits: {},
                };
                const allTickers = Array.from(
                  new Set([
                    ...Object.keys(holdings.stockHoldingsFrom),
                    ...Object.keys(holdings.stockHoldingsTo),
                  ]),
                );
                Object.values(holdings.periodProfits || {}).reduce(
                  (sum, profit) => sum + (profit || 0),
                  0,
                );
                return `
                  <div>
                    <h3 class="portfolio-header">${portfolio.name} ${
                      portfolio.description ? ` - ${portfolio.description}` : ""
                    }</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Stock Name</th>
                          ${
                            isSummaryReport
                              ? ""
                              : `<th>Shares (${formattedFromDate})</th><th>Value (${formattedFromDate})</th>`
                          }
                          <th>Shares (${formattedToDate})</th>
                          <th>Value (${formattedToDate})</th>
                          ${
                            formattedFromDate
                              ? `<th>Profit Over Period ($)</th>`
                              : ""
                          }
                        </tr>
                      </thead>
                      <tbody>
                        ${allTickers
                          .map((ticker) => {
                            const fromHolding = holdings.stockHoldingsFrom[
                              ticker
                            ] || {
                              quantity: 0,
                              value: 0,
                            };
                            const toHolding = holdings.stockHoldingsTo[
                              ticker
                            ] || {
                              quantity: 0,
                              value: 0,
                            };
                            const periodProfit =
                              holdings.periodProfits?.[ticker] || 0;
                            const periodProfitClass =
                              periodProfit >= 0
                                ? "profit-positive"
                                : "profit-negative";
                            return `
                              <tr>
                                <td>${ticker}</td>
                                ${
                                  !isSummaryReport
                                    ? `<td>${fromHolding.quantity}</td><td>$${fromHolding.value.toFixed(
                                        2,
                                      )}</td>`
                                    : ""
                                }
                                <td>${toHolding.quantity}</td>
                                <td>$${toHolding.value.toFixed(2)}</td>
                                ${
                                  formattedFromDate
                                    ? `<td class="${periodProfitClass}">$${periodProfit.toFixed(
                                        2,
                                      )}</td>`
                                    : ""
                                }
                              </tr>
                            `;
                          })
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                `;
              })
              .join("")}
            <div>
              <h2 class="section-header">Portfolio Value</h2>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    ${
                      isSummaryReport
                        ? `<th>Value (${formattedToDate})</th><th>Total Profit Over Period ($)</th>`
                        : `<th>Value (${formattedFromDate})</th><th>Value (${formattedToDate})</th><th>Total Profit Over Period ($)</th>`
                    }
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Portfolio Value</td>
                    ${
                      isSummaryReport
                        ? `
                          <td>$${Object.values(data.portfolioHoldings)
                            .reduce(
                              (sum, holding) => sum + holding.portfolioValueTo,
                              0,
                            )
                            .toFixed(2)}</td>
                          <td class="${
                            Object.values(data.portfolioHoldings).reduce(
                              (sum, holding) =>
                                sum +
                                Object.values(
                                  holding.periodProfits || {},
                                ).reduce(
                                  (pSum, profit) => pSum + (profit || 0),
                                  0,
                                ),
                              0,
                            ) >= 0
                              ? "profit-positive"
                              : "profit-negative"
                          }">$${Object.values(data.portfolioHoldings)
                            .reduce(
                              (sum, holding) =>
                                sum +
                                Object.values(
                                  holding.periodProfits || {},
                                ).reduce(
                                  (pSum, profit) => pSum + (profit || 0),
                                  0,
                                ),
                              0,
                            )
                            .toFixed(2)}</td>
                        `
                        : `
                          <td>$${Object.values(data.portfolioHoldings)
                            .reduce(
                              (sum, holding) =>
                                sum + holding.portfolioValueFrom,
                              0,
                            )
                            .toFixed(2)}</td>
                          <td>$${Object.values(data.portfolioHoldings)
                            .reduce(
                              (sum, holding) => sum + holding.portfolioValueTo,
                              0,
                            )
                            .toFixed(2)}</td>
                          <td class="${
                            Object.values(data.portfolioHoldings).reduce(
                              (sum, holding) =>
                                sum +
                                Object.values(
                                  holding.periodProfits || {},
                                ).reduce(
                                  (pSum, profit) => pSum + (profit || 0),
                                  0,
                                ),
                              0,
                            ) >= 0
                              ? "profit-positive"
                              : "profit-negative"
                          }">$${Object.values(data.portfolioHoldings)
                            .reduce(
                              (sum, holding) =>
                                sum +
                                Object.values(
                                  holding.periodProfits || {},
                                ).reduce(
                                  (pSum, profit) => pSum + (profit || 0),
                                  0,
                                ),
                              0,
                            )
                            .toFixed(2)}</td>
                        `
                    }
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `;
        break;

      case "summary":
        htmlContent += `
          <div>
            <h2 class="section-header">Portfolio Summary as of ${formattedToDate}</h2>
            <p>Summary of portfolio values and profits over the last year (${
              formattedFromDate || "N/A"
            } to ${formattedToDate}).</p>
            <table>
              <thead>
                <tr>
                  <th>Portfolio Name</th>
                  <th>Description</th>
                  <th>Value as of ${formattedToDate} ($)</th>
                  ${
                    formattedFromDate
                      ? `<th>Profit Over Last Year ($)</th>`
                      : ""
                  }
                </tr>
              </thead>
              <tbody>
                ${data.portfolios
                  .map((portfolio) => {
                    const portfolioId = portfolio._id;
                    const holdings = data.portfolioHoldings[portfolioId] || {
                      stockHoldingsFrom: {},
                      stockHoldingsTo: {},
                      portfolioValueFrom: 0,
                      portfolioValueTo: 0,
                      periodProfits: {},
                    };
                    const totalPeriodProfit = Object.values(
                      holdings.periodProfits || {},
                    ).reduce((sum, profit) => sum + (profit || 0), 0);
                    return `
                      <tr>
                        <td>${portfolio.name}</td>
                        <td>${portfolio.description ? `${portfolio.description}` : "N/A"}</td>
                        <td>$${holdings.portfolioValueTo.toFixed(2)}</td>
                        ${
                          formattedFromDate
                            ? `<td class="${
                                totalPeriodProfit >= 0
                                  ? "profit-positive"
                                  : "profit-negative"
                              }">$${totalPeriodProfit.toFixed(2)}</td>`
                            : ""
                        }
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
        break;

      case "ai_portfolio_summary":
      case "ai_account_summary":
        const isAccountSummary = data.reportType === "ai_account_summary";
        const currentHoldings =
          data.portfolioHoldings &&
          Object.keys(data.portfolioHoldings).length > 0
            ? [
                ...new Set(
                  Object.values(data.portfolioHoldings).flatMap((h) =>
                    Object.keys(h.stockHoldingsTo),
                  ),
                ),
              ]
            : [];

        if (currentHoldings.length === 0) {
          htmlContent += `
            <div>
              <h2 class="section-header">${
                isAccountSummary ? "AI Account Summary" : "AI Portfolio Summary"
              } as of ${formattedToDate}</h2>
              <p>No holdings available to generate AI predictions.</p>
            </div>
          `;
          break;
        }

        console.log("Current holdings: ", currentHoldings);

        const pricePromises = currentHoldings.map(async (symbol) => ({
          symbol,
          price: await getTodayPriceBySymbol(symbol),
        }));
        const prices = await Promise.all(pricePromises);
        const currentPrices: Record<string, number> = prices.reduce(
          (acc, { symbol, price }) => {
            acc[symbol] = price;
            return acc;
          },
          {} as Record<string, number>,
        );

        const aiPredictions: AIPrediction[] = await getAIPredictions(
          currentHoldings,
          currentPrices,
        );
        const aiRecommendations: AIPrediction[] = await getAIRecommendations(
          data.portfolioHoldings || {},
          aiPredictions,
        );

        htmlContent += `
          <div>
            <h2 class="section-header">${
              isAccountSummary ? "AI Account Summary" : "AI Portfolio Summary"
            } as of ${formattedToDate}</h2>
            
            <h3 class="portfolio-header">12-Month Price Predictions</h3>
            <table>
              <thead>
                <tr>
                  <th>Stock/Fund</th>
                  <th>Current Price ($)</th>
                  <th>Predicted Price ($)</th>
                  <th>Predicted Change (%)</th>
                </tr>
              </thead>
              <tbody>
                ${aiPredictions
                  .map(
                    (pred) => `
                  <tr>
                    <td>${pred.symbol}</td>
                    <td>$${pred.currentPrice.toFixed(2)}</td>
                    <td>$${pred.predictedPrice12Months.toFixed(2)}</td>
                    <td class="${
                      pred.predictedChangePercentage >= 0
                        ? "profit-positive"
                        : "profit-negative"
                    }">${pred.predictedChangePercentage.toFixed(2)}%</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>

           <h3 class="portfolio-header">Investment Rotation Suggestions</h3>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Current Price ($)</th>
                  <th>Predicted Price ($)</th>
                  <th>Predicted Change (%)</th>
                </tr>
              </thead>
              <tbody>
                ${aiRecommendations
                  .map(
                    (pred) => `
                  <tr>
                    <td>${pred.symbol || "N/A"}</td>
                    <td>$${pred.currentPrice.toFixed(2)}</td>
                    <td>$${pred.predictedPrice12Months.toFixed(2)}</td>
                    <td class="${
                      pred.predictedChangePercentage >= 0
                        ? "profit-positive"
                        : "profit-negative"
                    }">${pred.predictedChangePercentage.toFixed(2)}%</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>

            <h3 class="portfolio-header">Suggestions Justifications</h3>
            <table>
              <thead>
                <tr>
                  <th>Stock Symbol</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                ${aiRecommendations
                  .map(
                    (pred) => `
                  <tr>
                    <td>${pred.symbol || "N/A"}</td>
                    <td>${pred.justification || "No reasoning provided"}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            
            <p class="subheader">Note: AI predictions are generated using Google's Gemini 2.0 Flash model and are for demonstration purposes only.</p>
          </div>
        `;
        break;

      default:
        console.error(`Unsupported report type: ${data.reportType}`);
    }

    htmlContent += `
      </body>
      </html>
    `;

    console.log("Launching Puppeteer to generate PDF...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    await browser.close();

    console.log(
      "Debug: PDF buffer successfully generated, size:",
      pdfBuffer.length,
    );
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
