import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { generatePDF } from "@/lib/reportUtils";
import Report from "@/models/Report";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { getTransactions } from "@/lib/transactions";
import { getPortfolios } from "@/lib/portfolioDetails";
import { authOptions } from "@/lib/auth";
import {
  calculatePortfolioValue,
  calculateStockHoldings,
} from "@/lib/portfolioCalculations";
import { getStocksPriceForDay } from "@/lib/stockPrices";
import { PortfolioData, PortfolioHoldings } from "@/types/portfolio"; // Import PortfolioData

export async function POST(request: Request) {
  try {
    console.log("Authenticating user...");
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.error("Authentication failed: Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Parsing request payload...");
    const {
      selectedPortfolios,
      type: reportType,
      format,
      dateRange,
      name,
    } = await request.json();

    console.log("Received payload:", {
      selectedPortfolios,
      reportType,
      format,
      dateRange,
      name,
    });

    // Validate required fields
    if (!reportType || !format || !dateRange?.to || !name) {
      console.error("Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (
      !["income_report", "portfolio_report", "summary"].includes(reportType)
    ) {
      console.error("Validation failed: Invalid report type");
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
    }

    const fromDateObj: Date | undefined = dateRange.from
      ? new Date(dateRange.from)
      : undefined;
    const toDateObj: Date = new Date(dateRange.to);

    if (
      isNaN(toDateObj.getTime()) ||
      (fromDateObj && isNaN(fromDateObj.getTime()))
    ) {
      console.error("Validation failed: Invalid date format", { dateRange });
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (fromDateObj && toDateObj < fromDateObj) {
      console.error("Validation failed: End date must be after start date");
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    const formattedFromDate = fromDateObj
      ? fromDateObj.toISOString().split("T")[0]
      : undefined;
    const formattedToDate = toDateObj.toISOString().split("T")[0];
    console.log("Formatted From Date:", formattedFromDate);
    console.log("Formatted To Date:", formattedToDate);

    console.log("Connecting to database...");
    await dbConnect();

    console.log("Validating portfolio IDs...");
    const portfolioIds = Array.isArray(selectedPortfolios)
      ? selectedPortfolios
      : [selectedPortfolios];

    if (portfolioIds.length === 0) {
      console.error("Validation failed: No portfolios selected");
      return NextResponse.json(
        { error: "No portfolios selected" },
        { status: 400 },
      );
    }

    const portfolioObjectIds = portfolioIds.map((id: string) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (error) {
        console.error(`Invalid portfolio ID: ${id}`, error);
        throw new Error(`Invalid portfolio ID: ${id}`);
      }
    });

    // Fetch portfolio details (name and description)
    console.log("Fetching portfolio details...");
    const portfolioDetails = await getPortfolios(portfolioIds);
    const portfolios = portfolioDetails.map((portfolio) => ({
      _id: portfolio._id.toString(),
      name: portfolio.name,
      description: portfolio.description || "",
    }));

    // Initialize portfolio holdings object
    const portfolioHoldings: Record<string, PortfolioHoldings> = {};

    for (const portfolioId of portfolioIds) {
      console.log(`Processing portfolio: ${portfolioId}`);
      const transactions = await getTransactions(portfolioId);

      if (!transactions || transactions.length === 0) {
        console.warn(`No transactions found for portfolio ID: ${portfolioId}`);
        portfolioHoldings[portfolioId] = {
          stockHoldingsFrom: {},
          stockHoldingsTo: {},
          portfolioValueFrom: 0,
          portfolioValueTo: 0,
        };
        continue;
      }

      // Calculate holdings for fromDate if provided
      const stockHoldingsFrom = formattedFromDate
        ? await calculateStockHoldings(transactions, formattedFromDate)
        : {};
      const stockPricesFrom = formattedFromDate
        ? await getStocksPriceForDay(stockHoldingsFrom, formattedFromDate)
        : {};
      const portfolioValueFrom = formattedFromDate
        ? calculatePortfolioValue(stockHoldingsFrom, stockPricesFrom)
        : 0;

      // Calculate holdings for toDate
      const stockHoldingsTo = await calculateStockHoldings(
        transactions,
        formattedToDate,
      );
      const stockPricesTo = await getStocksPriceForDay(
        stockHoldingsTo,
        formattedToDate,
      );
      const portfolioValueTo = calculatePortfolioValue(
        stockHoldingsTo,
        stockPricesTo,
      );

      // Transform holdings to include quantity and value
      const stockHoldingsFromWithValues: Record<
        string,
        { quantity: number; value: number }
      > = {};
      const stockHoldingsToWithValues: Record<
        string,
        { quantity: number; value: number }
      > = {};

      if (formattedFromDate) {
        for (const symbol in stockHoldingsFrom) {
          const quantity = stockHoldingsFrom[symbol];
          const price = stockPricesFrom[symbol] || 0;
          const value = quantity * price;
          stockHoldingsFromWithValues[symbol] = { quantity, value };
          if (price === 0) {
            console.warn(
              `No valid price found for ${symbol} on ${formattedFromDate}, value set to 0`,
            );
          }
        }
      }

      for (const symbol in stockHoldingsTo) {
        const quantity = stockHoldingsTo[symbol];
        const price = stockPricesTo[symbol] || 0;
        const value = quantity * price;
        stockHoldingsToWithValues[symbol] = { quantity, value };
        if (price === 0) {
          console.warn(
            `No valid price found for ${symbol} on ${formattedToDate}, value set to 0`,
          );
        }
      }

      portfolioHoldings[portfolioId] = {
        stockHoldingsFrom: stockHoldingsFromWithValues,
        stockHoldingsTo: stockHoldingsToWithValues,
        portfolioValueFrom,
        portfolioValueTo,
      };
    }

    console.log("Portfolio Holdings:", portfolioHoldings);

    const generationInputs: PortfolioData = {
      fromDate: formattedFromDate,
      toDate: formattedToDate,
      reportType,
      portfolios,
      portfolioHoldings,
    };

    if (!generationInputs || Object.keys(generationInputs).length === 0) {
      console.error("Validation failed: Invalid data for report generation");
      return NextResponse.json(
        { error: "Invalid data for report generation" },
        { status: 400 },
      );
    }

    console.log("Generating report file...");
    const fileName = `${name}.${format}`;
    let mimeType, fileBuffer;

    switch (format) {
      case "json":
        console.log("Generating JSON report...");
        fileBuffer = Buffer.from(JSON.stringify(generationInputs, null, 2));
        mimeType = "application/json";
        break;

      case "pdf":
      default:
        console.log("Generating PDF report...");
        fileBuffer = await generatePDF(generationInputs);
        mimeType = "application/pdf";
        break;
    }

    console.log("Saving report to database...");
    const newReport = new Report({
      user_id: session.user.id,
      portfolio_ids: portfolioObjectIds,
      report_type: reportType,
      name: name,
      report_format: format,
      generation_inputs: {
        from_date: fromDateObj,
        to_date: toDateObj,
      },
      file_name: fileName,
    });

    console.log("Saving report with data:", newReport.toObject());
    await newReport.save();

    console.log("Preparing response...");
    const resolvedFileBuffer = fileBuffer;

    console.log("Report generated successfully:", fileName);
    return new Response(resolvedFileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: `Error generating report: ${error}` },
      { status: 500 },
    );
  }
}
